-- ============================================================
-- Luxor Smart Mall - v7: Discounts + Sizes/Colors variants +
--                        Full-size images + Admin role guard
-- Run this AFTER 0009_r2_storage.sql in Supabase SQL Editor
-- Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1) DISCOUNTS — "price before" (compare-at price)
--    price            = السعر الحالي (بعد الخصم)
--    compare_at_price = السعر قبل الخصم (اختياري). عندما يكون
--                       أكبر من price تُحسب نسبة الخصم تلقائياً
-- ============================================================
alter table public.products
  add column if not exists compare_at_price numeric(12,2);

alter table public.products
  drop constraint if exists products_compare_at_positive;
alter table public.products
  add constraint products_compare_at_positive
  check (compare_at_price is null or compare_at_price > 0);

-- ============================================================
-- 2) VARIANTS — sizes & colors (flexible JSONB)
--    sizes  : [{ "name": "M", "qty": 5, "available": true }, ...]
--    colors : [{ "name": "أحمر", "hex": "#cc0000", "image": "<url|null>" }, ...]
--             image = رابط صورة المنتج المرتبطة بهذا اللون
-- ============================================================
alter table public.products
  add column if not exists sizes jsonb not null default '[]'::jsonb;

alter table public.products
  add column if not exists colors jsonb not null default '[]'::jsonb;

-- ============================================================
-- 3) FULL-SIZE ORIGINALS
--    images       = الصور المقصوصة (تُعرض في الكروت/المعرض)
--    images_full  = الصور الأصلية كاملة الأبعاد (تُعرض عند التكبير)
--    same index alignment as images; empty string = no original
-- ============================================================
alter table public.products
  add column if not exists images_full text[] not null default '{}';

-- ============================================================
-- 4) ADMIN ROLE GUARD
--    يمنع رجوع حساب الأدمن لحساب عادي عن طريق الخطأ:
--    لا يُسمح بسحب رتبة admin إلا إذا كان المنفّذ أدمن آخر
--    (وليس نفس المستخدم، ولا أي عملية تلقائية بدون جلسة)
-- ============================================================
create or replace function public.protect_admin_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.role = 'admin' and new.role is distinct from 'admin' then
    -- The ONLY allowed demotion: ANOTHER admin explicitly demotes this user.
    -- auth.uid() is null for service-role / SQL editor → keep admin.
    if auth.uid() is null
       or auth.uid() = old.id
       or not exists (
         select 1 from public.profiles p
         where p.id = auth.uid() and p.role = 'admin'
       )
    then
      new.role := 'admin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_admin_role on public.profiles;
create trigger trg_protect_admin_role
  before update on public.profiles
  for each row execute function public.protect_admin_role();

-- ============================================================
-- 5) VERIFY (optional)
-- select column_name from information_schema.columns
--   where table_name = 'products'
--     and column_name in ('compare_at_price','sizes','colors','images_full');
