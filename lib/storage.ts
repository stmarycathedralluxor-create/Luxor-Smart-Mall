import type { SupabaseClient } from '@supabase/supabase-js';

export type QuotaInfo = {
  used_bytes: number;
  limit_bytes: number;
};

/** Extension that matches the compressed blob's real mime type */
export function blobExt(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp';
  if (blob.type === 'image/png') return 'png';
  return 'jpg';
}

/** Buckets this app owns; only these may ever be cleaned up */
const APP_BUCKETS = ['product-images', 'store-assets'];

/**
 * Parse a Supabase public storage URL into { bucket, path }.
 * Returns null for anything that's not one of our storage URLs.
 */
export function parseStorageUrl(url?: string | null): { bucket: string; path: string } | null {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  const bucket = m[1];
  if (!APP_BUCKETS.includes(bucket)) return null;
  try {
    return { bucket, path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket, path: m[2] };
  }
}

/**
 * Physically delete storage files behind the given public URLs.
 * Best-effort: groups by bucket, ignores failures (RLS, already deleted...).
 * This guarantees space is actually freed when products/stores/images are
 * deleted — without depending on DB triggers being installed.
 */
export async function removeStorageUrls(
  supabase: SupabaseClient,
  urls: (string | null | undefined)[]
): Promise<void> {
  const byBucket = new Map<string, string[]>();
  for (const url of urls) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    const list = byBucket.get(parsed.bucket) ?? [];
    if (!list.includes(parsed.path)) list.push(parsed.path);
    byBucket.set(parsed.bucket, list);
  }
  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      try {
        const { data } = await supabase.storage.from(bucket).remove(paths);
        // Verify what was ACTUALLY deleted — RLS can silently skip files.
        // Retry the missing ones one-by-one so a single bad path can't
        // poison the whole batch (this is why store-assets files were
        // sometimes left behind while product-images got cleaned).
        const removed = new Set((data ?? []).map((o: { name: string }) => o.name));
        const missing = paths.filter((p) => !removed.has(p));
        if (missing.length) {
          await Promise.all(
            missing.map((p) =>
              supabase.storage
                .from(bucket)
                .remove([p])
                .catch(() => {})
            )
          );
        }
      } catch {
        /* best-effort cleanup — never block the main operation */
      }
    })
  );
}

/**
 * Deep-clean ALL storage files of a store owner when their store is deleted.
 *
 * Why: URL-based cleanup can miss files (stale URLs, renamed files, silent
 * RLS skips) — which left store logos/covers orphaned in `store-assets`.
 * Since each user owns at most ONE store (unique owner_id), deleting the
 * store means we can safely sweep:
 *   - the whole `product-images/{ownerId}/` folder
 *   - `store-assets/{ownerId}/` logo-* and cover-* files (avatar is kept)
 */
export async function removeStoreOwnerFiles(
  supabase: SupabaseClient,
  ownerId: string
): Promise<void> {
  if (!ownerId) return;
  const sweep = async (bucket: string, keepAvatar: boolean) => {
    try {
      // Supabase list() paginates at 100 by default — loop until empty
      const toRemove: string[] = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(ownerId, { limit: 100, offset: page * 100 });
        if (error || !data || data.length === 0) break;
        for (const f of data) {
          if (!f.name) continue;
          if (keepAvatar && f.name.startsWith('avatar-')) continue;
          toRemove.push(`${ownerId}/${f.name}`);
        }
        if (data.length < 100) break;
      }
      if (toRemove.length) {
        // remove in chunks of 50 to stay well under API limits
        for (let i = 0; i < toRemove.length; i += 50) {
          await supabase.storage.from(bucket).remove(toRemove.slice(i, i + 50));
        }
      }
    } catch {
      /* best-effort — never block the main operation */
    }
  };
  await Promise.all([
    sweep('product-images', false),
    sweep('store-assets', true), // keep the user's personal avatar
  ]);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

/**
 * Friendly pre-check before uploading: returns an Arabic error message when
 * the user's storage quota would be exceeded, or null when OK.
 * Gracefully allows the upload if the RPC isn't installed yet â the
 * DB-level storage policy still enforces the hard limit.
 */
export async function checkQuotaBeforeUpload(
  supabase: SupabaseClient,
  nextBlobSize: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_my_storage_quota');
    if (error || !data) return null;
    const q = data as QuotaInfo;
    if (q.used_bytes + nextBlobSize > q.limit_bytes) {
      return `تجاوزت مساحة التخزين المسموحة (${formatBytes(q.limit_bytes)}). المستخدم حالياً: ${formatBytes(q.used_bytes)}. احذف بعض الصور القديمة أو تواصل مع الإدارة لزيادة المساحة.`;
    }
    return null;
  } catch {
    return null;
  }
}
