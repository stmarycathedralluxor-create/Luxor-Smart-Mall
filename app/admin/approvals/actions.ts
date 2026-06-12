'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { removeStorageUrlsServer, removeStoreOwnerFilesServer } from '@/lib/storage-server';

/**
 * Helper: ensure the caller is an authenticated admin.
 * Throws if not. Returns the supabase server client + user id.
 */
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    throw new Error('غير مصرّح: يجب تسجيل الدخول');
  }

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profErr) throw new Error(profErr.message);
  if (!prof || prof.role !== 'admin') {
    throw new Error('غير مصرّح: صلاحية المدير مطلوبة');
  }

  return { supabase, userId: user.id };
}

function refreshAdmin() {
  // refresh anywhere the pending lists/counters appear
  revalidatePath('/admin/approvals');
  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/stores');
}

// ---------- SELLERS ----------

export async function approveSellerAction(userId: string) {
  const { supabase } = await requireAdmin();

  // Read current role so we can upgrade buyer -> seller (keep admin/both as-is).
  const { data: target, error: readErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (readErr) return { ok: false, error: readErr.message };
  if (!target) return { ok: false, error: 'المستخدم غير موجود' };

  const currentRole = target.role || 'buyer';
  const newRole =
    currentRole === 'buyer' || !currentRole ? 'seller' : currentRole;

  const { error } = await supabase
    .from('profiles')
    .update({ is_seller_approved: true, role: newRole, wants_to_sell: true })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };

  refreshAdmin();
  return { ok: true };
}

export async function rejectSellerAction(userId: string) {
  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from('profiles')
    .update({ wants_to_sell: false, is_seller_approved: false })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };

  refreshAdmin();
  return { ok: true };
}

// ---------- STORES ----------

export async function approveStoreAction(storeId: string) {
  const { supabase } = await requireAdmin();

  // Load store so we can also approve its owner as a seller (so the seller flow
  // is fully consistent: an approved store implies an approved seller).
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .select('id, owner_id, slug')
    .eq('id', storeId)
    .maybeSingle();

  if (storeErr) return { ok: false, error: storeErr.message };
  if (!store) return { ok: false, error: 'المتجر غير موجود' };

  const { error } = await supabase
    .from('stores')
    .update({ is_approved: true, is_active: true })
    .eq('id', storeId);

  if (error) return { ok: false, error: error.message };

  // Best-effort: auto-approve the owner as a seller if they were still pending
  if (store.owner_id) {
    const { data: owner } = await supabase
      .from('profiles')
      .select('role, is_seller_approved')
      .eq('id', store.owner_id)
      .maybeSingle();

    if (owner && !owner.is_seller_approved) {
      const newRole =
        !owner.role || owner.role === 'buyer' ? 'seller' : owner.role;
      await supabase
        .from('profiles')
        .update({ is_seller_approved: true, role: newRole, wants_to_sell: true })
        .eq('id', store.owner_id);
    }
  }

  refreshAdmin();
  if (store.slug) revalidatePath(`/stores/${store.slug}`);
  return { ok: true };
}

export async function rejectStoreAction(storeId: string) {
  const { supabase } = await requireAdmin();

  // Collect storage files (logo/cover + product images) BEFORE deleting
  const urls: (string | null | undefined)[] = [];
  const { data: store } = await supabase
    .from('stores')
    .select('logo_url, cover_url, owner_id')
    .eq('id', storeId)
    .maybeSingle();
  if (store) urls.push(store.logo_url, store.cover_url);
  const { data: prods } = await supabase
    .from('products')
    .select('images, images_full')
    .eq('store_id', storeId);
  (prods ?? []).forEach((p: any) => {
    if (p.images?.length) urls.push(...p.images);
    if (p.images_full?.length) urls.push(...p.images_full);
  });

  // Delete + verify (RLS can silently match 0 rows)
  const { data: deleted, error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId)
    .select('id');
  if (error) return { ok: false, error: error.message };
  if (!deleted || deleted.length === 0) {
    return { ok: false, error: 'تعذر حذف المتجر — لا تملك الصلاحية أو تم حذفه مسبقاً' };
  }

  // Physically free the storage space on Cloudflare R2 (+ legacy Supabase):
  // exact URLs + deep folder sweep so nothing stays orphaned
  await removeStorageUrlsServer(supabase, urls);
  if (store?.owner_id) {
    await removeStoreOwnerFilesServer(supabase, store.owner_id);
  }

  refreshAdmin();
  return { ok: true };
}
