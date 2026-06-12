-- ============================================================
-- Luxor Smart Mall - v8: Crop-as-metadata + Deposit (عربون)
-- Run this AFTER 0010_discounts_variants_admin_guard.sql
-- in the Supabase SQL Editor. Safe to re-run (idempotent)
-- ============================================================

-- ============================================================
-- 1) CROP METADATA — بدلاً من تخزين صورة مقصوصة + صورة أصلية
--    (ملفان لكل صورة)، نخزن الصورة الأصلية مرة واحدة فقط
--    ومعها متغيرات القص في عمود JSONB:
--    images_meta : مصفوفة بنفس ترتيب images، كل عنصر إما null
--                  (لا قص — تُعرض object-cover افتراضياً) أو:
--                  { "x": 0.1, "y": 0.05, "w": 0.8, "h": 0.8 }
--                  قيم كسرية (0..1) نسبةً لأبعاد الصورة الأصلية
--    إعادة القص = تحديث JSON فقط، بدون رفع أي ملف جديد
-- ============================================================
alter table public.products
  add column if not exists images_meta jsonb not null default '[]'::jsonb;

-- ============================================================
-- 2) DEPOSIT — الدفع المقدم (العربون)
--    deposit_type  : 'none' | 'percent' | 'amount'
--    deposit_value : النسبة المئوية (1-100) أو المبلغ بالجنيه
-- ============================================================
alter table public.products
  add column if not exists deposit_type text not null default 'none';

alter table public.products
  add column if not exists deposit_value numeric(12,2);

alter table public.products
  drop constraint if exists products_deposit_type_check;
alter table public.products
  add constraint products_deposit_type_check
  check (deposit_type in ('none', 'percent', 'amount'));

alter table public.products
  drop constraint if exists products_deposit_value_check;
alter table public.products
  add constraint products_deposit_value_check
  check (
    deposit_value is null
    or (deposit_type = 'percent' and deposit_value > 0 and deposit_value <= 100)
    or (deposit_type = 'amount' and deposit_value > 0)
    or deposit_type = 'none'
  );

-- ============================================================
-- 3) VERIFY (optional)
-- select column_name from information_schema.columns
--   where table_name = 'products'
--     and column_name in ('images_meta','deposit_type','deposit_value');
