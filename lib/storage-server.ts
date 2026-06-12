// =============================================================
// SERVER-ONLY storage helpers (Cloudflare R2 + legacy Supabase)
// Used by API routes and Server Actions. Never import in 'use client'.
// =============================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { r2DeleteKeys, r2KeyFromUrl, r2ListKeys } from '@/lib/r2';
import { parseStorageUrl } from '@/lib/storage';

/**
 * Physically delete the files behind the given public URLs.
 *  - R2 URLs        → batch-deleted from the R2 bucket + tracking rows removed
 *  - Legacy Supabase URLs → still removed from Supabase Storage (transition)
 * Best-effort: never throws, never blocks the main operation.
 */
export async function removeStorageUrlsServer(
  supabase: SupabaseClient,
  urls: (string | null | undefined)[]
): Promise<void> {
  const r2Keys: string[] = [];
  const legacyByBucket = new Map<string, string[]>();

  for (const url of urls) {
    if (!url) continue;
    const key = r2KeyFromUrl(url);
    if (key) {
      if (!r2Keys.includes(key)) r2Keys.push(key);
      continue;
    }
    const parsed = parseStorageUrl(url);
    if (parsed) {
      const list = legacyByBucket.get(parsed.bucket) ?? [];
      if (!list.includes(parsed.path)) list.push(parsed.path);
      legacyByBucket.set(parsed.bucket, list);
    }
  }

  await Promise.all([
    // R2: delete objects + their tracking rows (frees quota immediately)
    (async () => {
      if (!r2Keys.length) return;
      await r2DeleteKeys(r2Keys);
      try {
        await supabase.from('user_files').delete().in('path', r2Keys);
      } catch {
        /* best-effort */
      }
    })(),
    // Legacy Supabase Storage cleanup (old images uploaded before R2)
    ...Array.from(legacyByBucket.entries()).map(async ([bucket, paths]) => {
      try {
        await supabase.storage.from(bucket).remove(paths);
      } catch {
        /* best-effort */
      }
    }),
  ]);
}

/**
 * Deep-clean ALL storage files of a store owner when their store is deleted.
 * Sweeps both R2 (product-images/{owner}/ and store-assets/{owner}/ minus
 * the personal avatar) and legacy Supabase buckets.
 */
export async function removeStoreOwnerFilesServer(
  supabase: SupabaseClient,
  ownerId: string
): Promise<void> {
  if (!ownerId) return;

  // --- R2 sweep ---
  try {
    const [productKeys, assetKeys] = await Promise.all([
      r2ListKeys(`product-images/${ownerId}/`),
      r2ListKeys(`store-assets/${ownerId}/`),
    ]);
    const keep = (k: string) => k.split('/').pop()?.startsWith('avatar-');
    const toRemove = [...productKeys, ...assetKeys.filter((k) => !keep(k))];
    if (toRemove.length) {
      await r2DeleteKeys(toRemove);
      try {
        await supabase.from('user_files').delete().in('path', toRemove);
      } catch {
        /* best-effort */
      }
    }
  } catch {
    /* best-effort */
  }

  // --- Legacy Supabase sweep (files uploaded before the R2 migration) ---
  const sweep = async (bucket: string, keepAvatar: boolean) => {
    try {
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
      for (let i = 0; i < toRemove.length; i += 50) {
        await supabase.storage.from(bucket).remove(toRemove.slice(i, i + 50));
      }
    } catch {
      /* best-effort */
    }
  };
  await Promise.all([sweep('product-images', false), sweep('store-assets', true)]);
}
