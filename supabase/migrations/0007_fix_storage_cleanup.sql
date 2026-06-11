-- ============================================================
-- Luxor Smart Mall - v6: Fix storage cleanup (run once, idempotent)
--
-- WHY: migration 0006 added DB triggers that "cleaned" storage by
-- deleting rows straight from storage.objects. That only removes the
-- DATABASE RECORD — the physical file stays orphaned in the storage
-- backend forever, so the used space never actually went down.
-- Worse, the trigger raced with the app's proper Storage-API deletion:
-- the trigger removed the object row first, so the API call matched
-- nothing and could never delete the real file.
--
-- FIX: storage cleanup now happens in the app through the official
-- Supabase Storage API (which deletes BOTH the record and the file).
-- These triggers must therefore be removed.
-- ============================================================

-- 1) Drop the broken cleanup triggers
drop trigger if exists trg_cleanup_product_images on public.products;
drop trigger if exists trg_cleanup_removed_product_images on public.products;
drop trigger if exists trg_cleanup_store_assets on public.stores;
drop trigger if exists trg_cleanup_replaced_store_assets on public.stores;
drop trigger if exists trg_cleanup_replaced_avatar on public.profiles;

-- 2) Drop their helper functions (no longer used)
drop function if exists public.cleanup_product_images();
drop function if exists public.cleanup_removed_product_images();
drop function if exists public.cleanup_store_assets();
drop function if exists public.cleanup_replaced_store_assets();
drop function if exists public.cleanup_replaced_avatar();
drop function if exists public.delete_storage_url(text);

-- 3) Make sure owners AND admins can delete/update storage objects through
--    the Storage API (idempotent re-create, matches 0006 definitions)
drop policy if exists "product_images_owner_delete" on storage.objects;
create policy "product_images_owner_delete" on storage.objects
  for delete using (
    bucket_id in ('product-images', 'store-assets')
    and (auth.uid() = owner or public.is_admin())
  );

drop policy if exists "product_images_owner_update" on storage.objects;
create policy "product_images_owner_update" on storage.objects
  for update using (
    bucket_id in ('product-images', 'store-assets')
    and (auth.uid() = owner or public.is_admin())
  );

-- 4) OPTIONAL one-time repair: storage.objects rows whose physical file
--    was already orphaned by the old triggers can't be restored from SQL.
--    Their DB rows are already gone, so quota numbers are correct; the
--    orphaned physical files are invisible and harmless. Nothing to do.
