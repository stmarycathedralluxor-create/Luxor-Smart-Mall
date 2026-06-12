-- ============================================================
-- Luxor Smart Mall - v9: Cloudflare R2 storage migration
-- Images now live on Cloudflare R2. Supabase keeps:
--   * a lightweight `user_files` tracking table (size accounting)
--   * the per-user quota RPCs (now counting R2 + legacy files)
-- Run once in the Supabase SQL Editor. Idempotent.
-- ============================================================

-- ============================================================
-- 1) R2 FILE TRACKING TABLE (one row per uploaded object)
-- ============================================================
create table if not exists public.user_files (
  path        text primary key,              -- R2 object key: {bucket}/{user}/{file}
  user_id     uuid not null references public.profiles(id) on delete cascade,
  bucket      text not null check (bucket in ('product-images', 'store-assets')),
  size_bytes  bigint not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_user_files_user on public.user_files (user_id);

alter table public.user_files enable row level security;

-- Users manage their own rows; admins manage everything
drop policy if exists "user_files_select" on public.user_files;
create policy "user_files_select" on public.user_files
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_files_insert" on public.user_files;
create policy "user_files_insert" on public.user_files
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_files_update" on public.user_files;
create policy "user_files_update" on public.user_files
  for update using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_files_delete" on public.user_files;
create policy "user_files_delete" on public.user_files
  for delete using (auth.uid() = user_id or public.is_admin());

-- ============================================================
-- 2) QUOTA RPCs — now count R2 files (user_files) PLUS any
--    legacy files still sitting in Supabase Storage.
-- ============================================================
create or replace function public.get_user_storage_bytes(p_user uuid)
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select
    coalesce((select sum(f.size_bytes) from public.user_files f where f.user_id = p_user), 0)
    +
    coalesce((
      select sum(coalesce((o.metadata->>'size')::bigint, 0))
      from storage.objects o
      where o.bucket_id in ('product-images', 'store-assets')
        and o.owner = p_user
    ), 0);
$$;

-- (get_storage_limit_bytes / check_storage_quota / get_my_storage_quota
--  from migration 0006 keep working unchanged on top of this function.)

-- ============================================================
-- 3) ADMIN usage report — count R2 + legacy files per user
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
  with r2 as (
    select f.user_id as uid, count(*)::bigint as cnt, coalesce(sum(f.size_bytes), 0)::bigint as bytes
    from public.user_files f
    group by f.user_id
  ),
  legacy as (
    select o.owner as uid, count(*)::bigint as cnt,
           coalesce(sum(coalesce((o.metadata->>'size')::bigint, 0)), 0)::bigint as bytes
    from storage.objects o
    where o.bucket_id in ('product-images', 'store-assets')
    group by o.owner
  )
  select
    p.id,
    p.full_name,
    s.name,
    (coalesce(r2.cnt, 0) + coalesce(legacy.cnt, 0))::bigint,
    (coalesce(r2.bytes, 0) + coalesce(legacy.bytes, 0))::bigint,
    p.storage_limit_mb
  from public.profiles p
  left join public.stores s on s.owner_id = p.id
  left join r2 on r2.uid = p.id
  left join legacy on legacy.uid = p.id
  where coalesce(r2.cnt, 0) + coalesce(legacy.cnt, 0) > 0 or s.id is not null
  order by 5 desc;
end;
$$;

grant execute on function public.get_storage_usage_admin() to authenticated;

-- ============================================================
-- 4) DISABLE the old Supabase-storage DB triggers.
--    Cleanup now happens server-side against R2 (lib/storage-server.ts).
--    The triggers only knew how to delete storage.objects rows, which
--    would do nothing for R2 URLs — and we don't want them firing.
-- ============================================================
drop trigger if exists trg_cleanup_product_images on public.products;
drop trigger if exists trg_cleanup_removed_product_images on public.products;
drop trigger if exists trg_cleanup_store_assets on public.stores;
drop trigger if exists trg_cleanup_replaced_store_assets on public.stores;
drop trigger if exists trg_cleanup_replaced_avatar on public.profiles;

-- NOTE (rollback): to restore the old behaviour simply re-run
-- supabase/migrations/0006_stats_storage.sql — it recreates the triggers
-- and the original quota functions.
