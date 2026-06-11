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
        await supabase.storage.from(bucket).remove(paths);
      } catch {
        /* best-effort cleanup — never block the main operation */
      }
    })
  );
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
