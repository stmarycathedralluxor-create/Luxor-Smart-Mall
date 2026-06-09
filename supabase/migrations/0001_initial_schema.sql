-- ============================================================
-- Luxor Smart Mall - Initial Schema
-- Run this in Supabase SQL Editor (one shot)
-- ============================================================

-- 1) PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'buyer' check (role in ('buyer','seller','both')),
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) CATEGORIES
create table if not exists public.categories (
  id serial primary key,
  slug text unique not null,
  name_ar text not null,
  name_en text not null,
  icon text
);

insert into public.categories (slug, name_ar, name_en, icon) values
  ('antiques',      'تحف وهدايا',    'Antiques & Gifts',     '🏺'),
  ('clothing',      'ملابس وأقمشة',  'Clothing & Fabrics',   '👕'),
  ('jewelry',       'مجوهرات وفضة', 'Jewelry & Silver',     '💍'),
  ('food',          'أطعمة ومشروبات','Food & Drinks',        '🍯'),
  ('handicrafts',   'حرف يدوية',    'Handicrafts',          '🎨'),
  ('electronics',   'إلكترونيات',    'Electronics',          '📱'),
  ('home',          'منزل ومفروشات', 'Home & Furniture',     '🛋️'),
  ('beauty',        'تجميل وعطور',   'Beauty & Perfumes',    '🌸'),
  ('services',      'خدمات',         'Services',             '🛠️'),
  ('other',         'منتجات أخرى',   'Other',                '📦')
on conflict (slug) do nothing;

-- 3) STORES (one user can have one store - simple v1)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  whatsapp text not null,
  logo_url text,
  cover_url text,
  city text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create index if not exists idx_stores_owner on public.stores(owner_id);
create index if not exists idx_stores_active on public.stores(is_active);

-- 4) PRODUCTS
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id int references public.categories(id),
  title text not null,
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'EGP',
  images text[] not null default '{}',
  is_available boolean not null default true,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_created on public.products(created_at desc);
create index if not exists idx_products_available on public.products(is_available);

-- 5) AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6) UPDATED_AT TRIGGER
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_stores_updated on public.stores;
create trigger trg_stores_updated before update on public.stores
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles  enable row level security;
alter table public.stores    enable row level security;
alter table public.products  enable row level security;
alter table public.categories enable row level security;

-- PROFILES
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- CATEGORIES (public read)
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select using (true);

-- STORES
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read" on public.stores
  for select using (is_active = true or owner_id = auth.uid());

drop policy if exists "stores_owner_insert" on public.stores;
create policy "stores_owner_insert" on public.stores
  for insert with check (auth.uid() = owner_id);

drop policy if exists "stores_owner_update" on public.stores;
create policy "stores_owner_update" on public.stores
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "stores_owner_delete" on public.stores;
create policy "stores_owner_delete" on public.stores
  for delete using (auth.uid() = owner_id);

-- PRODUCTS
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select using (
    is_available = true
    or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert" on public.products
  for insert with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "products_owner_update" on public.products;
create policy "products_owner_update" on public.products
  for update using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "products_owner_delete" on public.products;
create policy "products_owner_delete" on public.products
  for delete using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

-- ============================================================
-- STORAGE BUCKET (run via Supabase Dashboard or SQL below)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- Storage policies: authenticated users can upload, everyone can read
drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id in ('product-images','store-assets'));

drop policy if exists "product_images_auth_upload" on storage.objects;
create policy "product_images_auth_upload" on storage.objects
  for insert with check (
    bucket_id in ('product-images','store-assets')
    and auth.role() = 'authenticated'
  );

drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects
  for delete using (
    bucket_id in ('product-images','store-assets')
    and auth.uid() = owner
  );

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects
  for update using (
    bucket_id in ('product-images','store-assets')
    and auth.uid() = owner
  );

-- ============================================================
-- VIEW COUNTER RPC
-- ============================================================
create or replace function public.increment_product_views(product_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views = views + 1 where id = product_id;
$$;
