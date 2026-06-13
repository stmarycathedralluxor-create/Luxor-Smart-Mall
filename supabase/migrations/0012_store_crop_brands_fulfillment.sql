-- ============================================================
-- Luxor Smart Mall - v9: Store crop-as-metadata + Brands +
--                        Fulfillment (خيارات الاستلام)
-- Run this AFTER 0011_crop_meta_deposit.sql
-- in the Supabase SQL Editor. Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1) STORE LOGO / COVER CROP METADATA
--    نفس نظام المنتجات (0011): الصورة الأصلية تُرفع مرة واحدة
--    فقط، وبيانات القص (x/y/w/h كسرية 0..1) تُحفظ JSON وتُطبّق
--    بـ CSS عند العرض. إعادة القص/التكبير = تحديث JSON فقط
--    بدون رفع أي ملف جديد.
-- ============================================================
alter table public.stores
  add column if not exists logo_meta jsonb;

alter table public.stores
  add column if not exists cover_meta jsonb;

-- ============================================================
-- 2) BRANDS — البراندات الخاصة بكل متجر
--    كل براند يضيفه البائع يُسجَّل مرة واحدة لكل متجر، ويظهر
--    كاختيار جاهز عند إضافة منتج جديد.
-- ============================================================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (store_id, name)
);

create index if not exists idx_brands_store on public.brands(store_id);

alter table public.brands enable row level security;

-- الكل يقرأ (لعرض البراند على صفحات المنتجات العامة)
drop policy if exists "brands_public_read" on public.brands;
create policy "brands_public_read" on public.brands
  for select using (true);

-- صاحب المتجر فقط يضيف/يعدّل/يحذف براندات متجره
drop policy if exists "brands_owner_insert" on public.brands;
create policy "brands_owner_insert" on public.brands
  for insert with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "brands_owner_update" on public.brands;
create policy "brands_owner_update" on public.brands
  for update using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "brands_owner_delete" on public.brands;
create policy "brands_owner_delete" on public.brands
  for delete using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

-- اسم البراند على المنتج نفسه (نص بسيط — يبقى حتى لو حُذف البراند)
alter table public.products
  add column if not exists brand text;

create index if not exists idx_products_brand on public.products(brand);

-- ============================================================
-- 3) FULFILLMENT — خيارات الاستلام لكل منتج
--    delivery        = توصيل
--    store_pickup    = استلام من المتجر
--    address_pickup  = استلام من عنوان يحدده البائع
--    pickup_address  = العنوان عند اختيار address_pickup
-- ============================================================
alter table public.products
  add column if not exists fulfillment_options text[] not null default '{}';

alter table public.products
  add column if not exists pickup_address text;

alter table public.products
  drop constraint if exists products_fulfillment_options_check;
alter table public.products
  add constraint products_fulfillment_options_check
  check (fulfillment_options <@ array['delivery','store_pickup','address_pickup']::text[]);

-- ============================================================
-- 4) VERIFY (optional)
-- select column_name from information_schema.columns
--   where table_name = 'stores'
--     and column_name in ('logo_meta','cover_meta');
-- select column_name from information_schema.columns
--   where table_name = 'products'
--     and column_name in ('brand','fulfillment_options','pickup_address');
-- select * from public.brands limit 5;
