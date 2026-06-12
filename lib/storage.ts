// =============================================================
// Client-safe storage helpers — images now live on CLOUDFLARE R2.
// Uploads/deletes go through our own API routes (/api/storage/*)
// which hold the R2 credentials server-side. Legacy Supabase URLs
// keep working and are still cleaned up during the transition.
// =============================================================
import type { SupabaseClient } from '@supabase/supabase-js';

export type QuotaInfo = {
  used_bytes: number;
  limit_bytes: number;
};

export type AppBucket = 'product-images' | 'store-assets';

/** Extension that matches the compressed blob's real mime type */
export function blobExt(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp';
  if (blob.type === 'image/png') return 'png';
  return 'jpg';
}

/** Buckets this app owns; only these may ever be cleaned up */
const APP_BUCKETS = ['product-images', 'store-assets'];

/**
 * Parse a LEGACY Supabase public storage URL into { bucket, path }.
 * Returns null for anything else (including the new R2 URLs).
 * Kept for the transition period: old images still live on Supabase.
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
 * Upload an image blob to Cloudflare R2 (via our server API).
 * Returns the public URL, or throws with a user-friendly message.
 */
export async function uploadImage(
  bucket: AppBucket,
  blob: Blob,
  filename?: string
): Promise<string> {
  const form = new FormData();
  form.append('file', blob);
  form.append('bucket', bucket);
  if (filename) form.append('filename', filename);
  const res = await fetch('/api/storage/upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) {
    throw new Error(json.error || 'فشل رفع الصورة');
  }
  return json.url as string;
}

/**
 * Physically delete storage files behind the given public URLs
 * (R2 + legacy Supabase). Best-effort: never throws.
 */
export async function removeStorageUrls(
  urls: (string | null | undefined)[]
): Promise<void> {
  const clean = urls.filter((u): u is string => !!u);
  if (!clean.length) return;
  try {
    await fetch('/api/storage/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: clean }),
    });
  } catch {
    /* best-effort cleanup — never block the main operation */
  }
}

/**
 * Deep-clean ALL storage files of a store owner when their store is
 * deleted (avatar is kept). Admin-only on the server (or self-sweep).
 */
export async function removeStoreOwnerFiles(
  ownerId: string,
  extraUrls: (string | null | undefined)[] = []
): Promise<void> {
  if (!ownerId) return;
  try {
    await fetch('/api/storage/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        urls: extraUrls.filter(Boolean),
        sweepOwnerId: ownerId,
      }),
    });
  } catch {
    /* best-effort — never block the main operation */
  }
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
 * The hard limit is also enforced server-side in /api/storage/upload.
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
