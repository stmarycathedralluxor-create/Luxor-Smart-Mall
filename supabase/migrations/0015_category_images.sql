-- ============================================================
-- Luxor Smart Mall - v15: صور الأقسام + إدارتها من لوحة الإدارة
-- شغّله بعد 0014 في Supabase SQL Editor. آمن لإعادة التشغيل (idempotent).
-- ============================================================
--
-- الهدف:
--   • إضافة صورة لكل قسم (image_url) + بيانات قص (image_meta) بنفس نظام
--     باقي الصور في الموقع (الصورة الأصلية تُخزَّن مرة واحدة ويُطبَّق القص
--     كمتغيّرات JSON بدون رفع ملفات إضافية).
--   • تمكين الأدمن من إضافة/تعديل/حذف الأقسام (INSERT/UPDATE/DELETE)
--     مع إبقاء القراءة عامة للجميع.
-- ============================================================

-- 1) أعمدة الصورة
alter table public.categories
  add column if not exists image_url  text,
  add column if not exists image_meta jsonb;

-- 2) سياسات الكتابة للأدمن فقط (القراءة تبقى عامة كما هي)
--    is_admin() مُعرّفة في 0014.

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert" on public.categories
  for insert
  with check ( public.is_admin() );

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update" on public.categories
  for update
  using ( public.is_admin() )
  with check ( public.is_admin() );

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete" on public.categories
  for delete
  using ( public.is_admin() );

-- ============================================================
-- VERIFY (optional)
-- select id, slug, name_ar, image_url from public.categories order by id;
-- ============================================================
