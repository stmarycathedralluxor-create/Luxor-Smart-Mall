-- ============================================================
-- Luxor Smart Mall - v11: Catalogs (الكتالوجات)
-- Run this AFTER 0012_store_crop_brands_fulfillment.sql
-- in the Supabase SQL Editor. Safe to re-run (idempotent).
-- ============================================================
--
-- نموذج الكتالوجات:
--  - الكتالوج له اسم (title) ووصف وصورة غلاف.
--  - النطاق (scope):
--      'store'  = كتالوج خاص بمتجر بائع، يظهر على صفحة المتجر فوراً
--                 بدون موافقة من الإدارة.
--      'global' = كتالوج عام يظهر في صفحة /catalog، ويحتاج موافقة
--                 الإدارة (is_approved). كتالوجات الأدمن global ومعتمدة
--                 تلقائياً.
--  - طريقة اختيار المنتجات (filter_type):
--      'all'         = كل منتجات المتجر المحدّد
--      'price_high'  = الأعلى سعراً
--      'rating_high' = الأعلى تقييماً
--      'manual'      = اختيار يدوي للمنتجات (عبر جدول catalog_products)
--  - filter_store_id: المتجر المصدر للمنتجات (للفلاتر التلقائية).
--  - product_limit: حد أقصى لعدد المنتجات في الفلاتر التلقائية (افتراضي 24).
-- ============================================================

create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- المتجر المالك (لكتالوجات البائع). يكون null لكتالوجات الأدمن العامة.
  store_id uuid references public.stores(id) on delete cascade,
  title text not null,
  description text,
  cover_image text,
  cover_meta jsonb,
  slug text not null unique,
  scope text not null default 'store' check (scope in ('store','global')),
  -- يُعتمد تلقائياً لكتالوجات المتجر؛ يحتاج موافقة للكتالوجات العامة
  is_approved boolean not null default false,
  filter_type text not null default 'manual'
    check (filter_type in ('all','price_high','rating_high','manual')),
  -- المتجر المصدر للمنتجات في الفلاتر التلقائية
  filter_store_id uuid references public.stores(id) on delete set null,
  product_limit int not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_catalogs_store on public.catalogs(store_id);
create index if not exists idx_catalogs_owner on public.catalogs(owner_id);
create index if not exists idx_catalogs_scope on public.catalogs(scope);

-- المنتجات المختارة يدوياً داخل كتالوج (filter_type = 'manual')
create table if not exists public.catalog_products (
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position int not null default 0,
  primary key (catalog_id, product_id)
);

create index if not exists idx_catalog_products_catalog on public.catalog_products(catalog_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.catalogs enable row level security;
alter table public.catalog_products enable row level security;

-- قراءة عامة: كتالوجات المتجر دائماً مرئية، والعامة فقط بعد الاعتماد.
-- المالك والأدمن يقرآن كل كتالوجاتهما حتى قبل الاعتماد.
drop policy if exists "catalogs_public_read" on public.catalogs;
create policy "catalogs_public_read" on public.catalogs
  for select using (
    scope = 'store'
    or is_approved = true
    or owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- إنشاء: المالك ينشئ كتالوجاته. كتالوجات المتجر يجب أن تخص متجراً يملكه.
drop policy if exists "catalogs_owner_insert" on public.catalogs;
create policy "catalogs_owner_insert" on public.catalogs
  for insert with check (
    owner_id = auth.uid()
    and (
      store_id is null
      or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
    )
  );

-- تعديل/حذف: المالك أو الأدمن
drop policy if exists "catalogs_owner_update" on public.catalogs;
create policy "catalogs_owner_update" on public.catalogs
  for update using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "catalogs_owner_delete" on public.catalogs;
create policy "catalogs_owner_delete" on public.catalogs
  for delete using (
    owner_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- catalog_products: قراءة عامة (تابعة لرؤية الكتالوج)، والكتابة للمالك/الأدمن
drop policy if exists "catalog_products_public_read" on public.catalog_products;
create policy "catalog_products_public_read" on public.catalog_products
  for select using (true);

drop policy if exists "catalog_products_owner_write" on public.catalog_products;
create policy "catalog_products_owner_write" on public.catalog_products
  for all using (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  )
  with check (
    exists (
      select 1 from public.catalogs c
      where c.id = catalog_id
        and (
          c.owner_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
        )
    )
  );

-- ============================================================
-- VERIFY (optional)
-- select * from public.catalogs limit 5;
-- select * from public.catalog_products limit 5;
-- ============================================================
