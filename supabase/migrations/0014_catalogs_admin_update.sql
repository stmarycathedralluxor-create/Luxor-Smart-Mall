-- ============================================================
-- Luxor Smart Mall - v12: إصلاح صلاحية اعتماد الكتالوجات
-- شغّله بعد 0013_catalogs.sql في Supabase SQL Editor.
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================
--
-- المشكلة:
--   عند اعتماد كتالوج عام من لوحة التحكم، كان التحديث ينجح بلا خطأ لكنه
--   لا يثبت — الكتالوج يبقى غير معتمد ولا يظهر في /catalog.
--
-- السبب:
--   سياسة UPDATE القديمة "catalogs_owner_update" تحتوي على USING فقط
--   بدون WITH CHECK. في PostgreSQL، عند غياب WITH CHECK يُستخدم تعبير
--   USING للتحقق من الصف الجديد أيضاً؛ ولأن USING يعتمد على owner_id =
--   auth.uid()، فإن الأدمن (الذي لا يملك الكتالوج) قد يُمنع من حفظ الصف
--   بعد التعديل في بعض الحالات، فيُرفض التغيير بصمت (0 صفوف).
--
-- الحل:
--   سياسة UPDATE واضحة للأدمن/المالك تتضمّن USING و WITH CHECK معاً،
--   فيُسمح بقراءة الصف القديم وكتابة الصف الجديد دون قيود.
-- ============================================================

-- دالة مساعدة: هل المستخدم الحالي أدمن؟ (تتفادى تكرار الاستعلام الفرعي)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- أعِد بناء سياسة التعديل بحيث تشمل WITH CHECK للأدمن والمالك
drop policy if exists "catalogs_owner_update" on public.catalogs;
create policy "catalogs_owner_update" on public.catalogs
  for update
  using (
    owner_id = auth.uid()
    or public.is_admin()
  )
  with check (
    owner_id = auth.uid()
    or public.is_admin()
  );

-- ============================================================
-- VERIFY (optional)
-- select id, title, scope, is_approved from public.catalogs order by created_at desc;
-- update public.catalogs set is_approved = true where id = '...'; -- كأدمن
-- ============================================================
