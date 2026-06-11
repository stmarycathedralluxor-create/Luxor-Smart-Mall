-- ════════════════════════════════════════════════════════════════
-- 0008: Product delivery type (instant vs pre-order/reservation)
--   - delivery_type:  'instant'  → المنتج متاح فوراً
--                     'preorder' → حجز / طلب مسبق (يصل خلال X أيام)
--   - delivery_days:  مدة الوصول بالأيام (only meaningful for preorder)
-- Idempotent: safe to run more than once.
-- ════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists delivery_type text not null default 'instant',
  add column if not exists delivery_days integer;

-- keep values sane
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_delivery_type_check'
  ) then
    alter table public.products
      add constraint products_delivery_type_check
      check (delivery_type in ('instant', 'preorder'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'products_delivery_days_check'
  ) then
    alter table public.products
      add constraint products_delivery_days_check
      check (delivery_days is null or (delivery_days >= 1 and delivery_days <= 365));
  end if;
end $$;

-- back-fill: existing products are considered instant
update public.products set delivery_type = 'instant' where delivery_type is null;
