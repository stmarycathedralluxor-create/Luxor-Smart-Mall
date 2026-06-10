-- ============================================================
-- Luxor Smart Mall - Approvals + Analytics + Orders
-- Run this AFTER 0002_admin_and_backfill.sql in Supabase SQL Editor
-- Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1) APPROVAL FLAGS
-- ============================================================

-- a) Seller approval on profiles
alter table public.profiles
  add column if not exists is_seller_approved boolean not null default false;

alter table public.profiles
  add column if not exists wants_to_sell boolean not null default false;

-- b) Store approval
alter table public.stores
  add column if not exists is_approved boolean not null default false;

-- Existing stores that were already active should stay visible
-- (one-time backfill: if a store was marked active before approvals existed, approve it).
update public.stores
set is_approved = true
where is_approved = false and is_active = true;

-- Existing sellers should be auto-approved too.
update public.profiles
set is_seller_approved = true
where is_seller_approved = false and role in ('seller','both','admin');

create index if not exists idx_stores_approved on public.stores(is_approved);
create index if not exists idx_profiles_seller_approved on public.profiles(is_seller_approved);

-- ============================================================
-- 2) ANALYTICS TABLES
-- ============================================================

-- a) Site visits (one row per visit; we dedupe by session_id + day in queries)
create table if not exists public.site_visits (
  id bigserial primary key,
  session_id text,
  user_id uuid references auth.users(id) on delete set null,
  path text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_visits_created on public.site_visits(created_at desc);
create index if not exists idx_site_visits_session on public.site_visits(session_id);

-- b) Store visits
create table if not exists public.store_visits (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_visits_store on public.store_visits(store_id);
create index if not exists idx_store_visits_created on public.store_visits(created_at desc);

-- c) Price inquiries (user asked to reveal price)
create table if not exists public.price_inquiries (
  id bigserial primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_price_inquiries_product on public.price_inquiries(product_id);
create index if not exists idx_price_inquiries_store on public.price_inquiries(store_id);
create index if not exists idx_price_inquiries_created on public.price_inquiries(created_at desc);

-- d) Orders (user clicked WhatsApp order)
create table if not exists public.orders (
  id bigserial primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create index if not exists idx_orders_product on public.orders(product_id);
create index if not exists idx_orders_store on public.orders(store_id);
create index if not exists idx_orders_created on public.orders(created_at desc);

-- ============================================================
-- 3) RLS for analytics tables
-- ============================================================

alter table public.site_visits     enable row level security;
alter table public.store_visits    enable row level security;
alter table public.price_inquiries enable row level security;
alter table public.orders          enable row level security;

-- Anyone (even anon) can insert their own visit / inquiry / order events
drop policy if exists "site_visits_insert_any" on public.site_visits;
create policy "site_visits_insert_any" on public.site_visits
  for insert with check (true);

drop policy if exists "store_visits_insert_any" on public.store_visits;
create policy "store_visits_insert_any" on public.store_visits
  for insert with check (true);

drop policy if exists "price_inquiries_insert_any" on public.price_inquiries;
create policy "price_inquiries_insert_any" on public.price_inquiries
  for insert with check (true);

drop policy if exists "orders_insert_any" on public.orders;
create policy "orders_insert_any" on public.orders
  for insert with check (true);

-- Only admins (and store owner for their own store) can read
drop policy if exists "site_visits_admin_read" on public.site_visits;
create policy "site_visits_admin_read" on public.site_visits
  for select using (public.is_admin());

drop policy if exists "store_visits_admin_or_owner_read" on public.store_visits;
create policy "store_visits_admin_or_owner_read" on public.store_visits
  for select using (
    public.is_admin()
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "price_inquiries_admin_or_owner_read" on public.price_inquiries;
create policy "price_inquiries_admin_or_owner_read" on public.price_inquiries
  for select using (
    public.is_admin()
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "orders_admin_or_owner_read" on public.orders;
create policy "orders_admin_or_owner_read" on public.orders
  for select using (
    public.is_admin()
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

-- ============================================================
-- 4) Update public read policies to require approval
-- ============================================================

-- STORES: only approved+active are public, owner & admin always
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores
  for select using (
    (is_active = true and is_approved = true)
    or owner_id = auth.uid()
    or public.is_admin()
  );

-- PRODUCTS: only show products of approved stores
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (
    (
      is_available = true
      and exists (
        select 1 from public.stores s
        where s.id = store_id
          and s.is_active = true
          and s.is_approved = true
      )
    )
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    or public.is_admin()
  );

-- ============================================================
-- 5) RPC HELPERS
-- ============================================================

-- a) Track site visit (callable by anon)
create or replace function public.track_site_visit(
  p_session_id text,
  p_path text default null,
  p_user_agent text default null,
  p_referrer text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.site_visits (session_id, user_id, path, user_agent, referrer)
  values (p_session_id, auth.uid(), p_path, p_user_agent, p_referrer);
end;
$$;

grant execute on function public.track_site_visit(text, text, text, text) to anon, authenticated;

-- b) Track store visit
create or replace function public.track_store_visit(
  p_store_id uuid,
  p_session_id text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.store_visits (store_id, user_id, session_id)
  values (p_store_id, auth.uid(), p_session_id);
end;
$$;

grant execute on function public.track_store_visit(uuid, text) to anon, authenticated;

-- c) Track price inquiry (only callable by authenticated users)
create or replace function public.track_price_inquiry(p_product_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'product not found';
  end if;

  insert into public.price_inquiries (product_id, store_id, user_id)
  values (p_product_id, v_store_id, auth.uid());
end;
$$;

grant execute on function public.track_price_inquiry(uuid) to authenticated;

-- d) Track order
create or replace function public.track_order(p_product_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select store_id into v_store_id from public.products where id = p_product_id;
  if v_store_id is null then
    raise exception 'product not found';
  end if;

  insert into public.orders (product_id, store_id, user_id)
  values (p_product_id, v_store_id, auth.uid());
end;
$$;

grant execute on function public.track_order(uuid) to authenticated;

-- e) Aggregate counters helper for admin dashboard
create or replace function public.get_admin_counters()
returns json
language plpgsql security definer set search_path = public as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  select json_build_object(
    'site_visits',     (select count(*) from public.site_visits),
    'store_visits',    (select count(*) from public.store_visits),
    'price_inquiries', (select count(*) from public.price_inquiries),
    'orders',          (select count(*) from public.orders),
    'pending_sellers', (select count(*) from public.profiles where wants_to_sell = true and is_seller_approved = false),
    'pending_stores',  (select count(*) from public.stores where is_approved = false)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_admin_counters() to authenticated;

-- f) Per-store counters (for seller dashboard)
create or replace function public.get_store_counters(p_store_id uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  result json;
  v_owner uuid;
begin
  select owner_id into v_owner from public.stores where id = p_store_id;
  if v_owner is null then
    raise exception 'store not found';
  end if;

  if v_owner <> auth.uid() and not public.is_admin() then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'visits',          (select count(*) from public.store_visits    where store_id = p_store_id),
    'price_inquiries', (select count(*) from public.price_inquiries where store_id = p_store_id),
    'orders',          (select count(*) from public.orders          where store_id = p_store_id)
  ) into result;

  return result;
end;
$$;

grant execute on function public.get_store_counters(uuid) to authenticated;

-- ============================================================
-- 6) Tweak signup trigger: keep new users as 'buyer' but
--    let them mark wants_to_sell=true to request seller role.
-- ============================================================
-- (existing handle_new_user already inserts role='buyer' default — nothing to change here)
