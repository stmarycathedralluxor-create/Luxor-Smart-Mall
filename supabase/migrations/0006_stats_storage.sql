-- ============================================================
-- Luxor Smart Mall - v5: Public Stats + Storage Quota + Cleanup
-- Run once in the Supabase SQL Editor. Idempotent.
-- ============================================================

-- ============================================================
-- 1) PUBLIC STATS RPCs (anon-readable, security definer)
-- ============================================================

-- a) Site-wide stats for the homepage
create or replace function public.get_public_site_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'site_visits',   (select count(*) from public.site_visits),
    'store_visits',  (select count(*) from public.store_visits),
    'product_views', (select coalesce(sum(views), 0) from public.products)
  );
$$;

grant execute on function public.get_public_site_stats() to anon, authenticated;

-- b) Per-store visit counter (shown publicly on the store page)
create or replace function public.get_store_visits_count(p_store_id uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.store_visits where store_id = p_store_id;
$$;

grant execute on function public.get_store_visits_count(uuid) to anon, authenticated;

-- c) Make sure the tracking RPCs are executable by everyone
grant execute on function public.increment_product_views(uuid) to anon, authenticated;
grant execute on function public.track_store_visit(uuid, text) to anon, authenticated;
grant execute on function public.track_site_visit(text, text, text, text) to anon, authenticated;

-- ============================================================
-- 2) STORAGE QUOTA PER USER (default 200 MB, admin-adjustable)
-- ============================================================

alter table public.profiles
  add column if not exists storage_limit_mb int;

create or replace function public.get_user_storage_bytes(p_user uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(coalesce((o.metadata->>'size')::bigint, 0)), 0)
  from storage.objects o
  where o.bucket_id in ('product-images', 'store-assets')
    and o.owner = p_user;
$$;

create or replace function public.get_storage_limit_bytes(p_user uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select storage_limit_mb from public.profiles where id = p_user),
    200
  )::bigint * 1024 * 1024;
$$;

create or replace function public.check_storage_quota()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.get_user_storage_bytes(auth.uid())
       < public.get_storage_limit_bytes(auth.uid());
$$;

grant execute on function public.check_storage_quota() to authenticated;

create or replace function public.get_my_storage_quota()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(
    'used_bytes',  public.get_user_storage_bytes(auth.uid()),
    'limit_bytes', public.get_storage_limit_bytes(auth.uid())
  );
$$;

grant execute on function public.get_my_storage_quota() to authenticated;

-- ENFORCE the quota on upload (recreate the insert policy)
drop policy if exists "product_images_auth_upload" on storage.objects;
create policy "product_images_auth_upload" on storage.objects
  for insert with check (
    bucket_id in ('product-images', 'store-assets')
    and auth.role() = 'authenticated'
    and public.check_storage_quota()
  );

-- Let ADMINS delete/update any object (cleanup of other users' files)
drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects
  for delete using (
    bucket_id in ('product-images', 'store-assets')
    and (auth.uid() = owner or public.is_admin())
  );

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects
  for update using (
    bucket_id in ('product-images', 'store-assets')
    and (auth.uid() = owner or public.is_admin())
  );

-- ============================================================
-- 3) ADMIN: per-user storage usage report + set limit
-- ============================================================
create or replace function public.get_storage_usage_admin()
returns table (
  user_id uuid,
  full_name text,
  store_name text,
  file_count bigint,
  total_bytes bigint,
  limit_mb int
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  select
    p.id,
    p.full_name,
    s.name,
    count(o.id)::bigint,
    coalesce(sum(coalesce((o.metadata->>'size')::bigint, 0)), 0)::bigint,
    p.storage_limit_mb
  from public.profiles p
  left join public.stores s on s.owner_id = p.id
  left join storage.objects o
    on o.owner = p.id
   and o.bucket_id in ('product-images', 'store-assets')
  group by p.id, p.full_name, s.id, s.name, p.storage_limit_mb
  having count(o.id) > 0 or s.id is not null
  order by 5 desc;
end;
$$;

grant execute on function public.get_storage_usage_admin() to authenticated;

-- Admin sets a per-user limit (null = back to default 200MB)
create or replace function public.set_storage_limit(p_user uuid, p_limit_mb int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  update public.profiles set storage_limit_mb = p_limit_mb where id = p_user;
end;
$$;

grant execute on function public.set_storage_limit(uuid, int) to authenticated;

-- ============================================================
-- 4) SERVER-SIDE STORAGE CLEANUP ON DELETE / REPLACE
--    Files are physically removed from storage so space is freed.
-- ============================================================

-- Helper: extract bucket/path from a public URL and delete the object
create or replace function public.delete_storage_url(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match text[];
  v_bucket text;
  v_path text;
begin
  if p_url is null or p_url = '' then return; end if;
  -- public URL format: .../storage/v1/object/public/<bucket>/<path>
  v_match := regexp_match(p_url, '/storage/v1/object/public/([^/]+)/(.+)$');
  if v_match is null then return; end if;
  v_bucket := v_match[1];
  v_path   := v_match[2];
  if v_bucket not in ('product-images', 'store-assets') then return; end if;
  delete from storage.objects where bucket_id = v_bucket and name = v_path;
exception when others then
  -- never block the main operation because of cleanup
  null;
end;
$$;

-- a) Product deleted -> delete all its images
create or replace function public.cleanup_product_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  img text;
begin
  if old.images is not null then
    foreach img in array old.images loop
      perform public.delete_storage_url(img);
    end loop;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_product_images on public.products;
create trigger trg_cleanup_product_images
  after delete on public.products
  for each row execute function public.cleanup_product_images();

-- b) Product updated -> delete images removed from the array
create or replace function public.cleanup_removed_product_images()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  img text;
begin
  if old.images is not null then
    foreach img in array old.images loop
      if new.images is null or not (img = any(new.images)) then
        perform public.delete_storage_url(img);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cleanup_removed_product_images on public.products;
create trigger trg_cleanup_removed_product_images
  after update of images on public.products
  for each row execute function public.cleanup_removed_product_images();

-- c) Store deleted -> delete logo + cover
--    (products cascade-delete and their own trigger cleans their images)
create or replace function public.cleanup_store_assets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.delete_storage_url(old.logo_url);
  perform public.delete_storage_url(old.cover_url);
  return old;
end;
$$;

drop trigger if exists trg_cleanup_store_assets on public.stores;
create trigger trg_cleanup_store_assets
  after delete on public.stores
  for each row execute function public.cleanup_store_assets();

-- d) Store updated -> delete replaced logo/cover
create or replace function public.cleanup_replaced_store_assets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.logo_url is distinct from new.logo_url then
    perform public.delete_storage_url(old.logo_url);
  end if;
  if old.cover_url is distinct from new.cover_url then
    perform public.delete_storage_url(old.cover_url);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cleanup_replaced_store_assets on public.stores;
create trigger trg_cleanup_replaced_store_assets
  after update of logo_url, cover_url on public.stores
  for each row execute function public.cleanup_replaced_store_assets();

-- e) Avatar replaced -> delete the old one
create or replace function public.cleanup_replaced_avatar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.avatar_url is distinct from new.avatar_url then
    perform public.delete_storage_url(old.avatar_url);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cleanup_replaced_avatar on public.profiles;
create trigger trg_cleanup_replaced_avatar
  after update of avatar_url on public.profiles
  for each row execute function public.cleanup_replaced_avatar();
