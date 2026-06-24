/**
 * Passthrough image loader for next/image.
 *
 * Why this exists
 * ---------------
 * We want to STOP using Vercel's on-demand Image Optimization API (the
 * `/_next/image?...` endpoint) because every transformation it serves counts
 * against the limited free-tier quota.
 *
 * The naive way to do that is `images.unoptimized: true`, but that flag also
 * makes next/image stop emitting a `srcset` and the intrinsic responsive
 * markup. Some of our layouts (especially wide desktop views that rely on the
 * `sizes` prop, `fill` + `object-*`, and the lightbox) depend on that markup,
 * and dropping it caused images to render at the wrong size or not show up.
 *
 * A custom `loader` keeps next/image's full responsive behaviour intact
 * (it still builds `srcset`/`sizes`, layout boxes, lazy-loading, etc.) while
 * letting US decide the final URL. Here we simply return the original source
 * URL unchanged — the bytes come straight from the origin CDN (Cloudflare R2
 * or Supabase Storage), so NO Vercel optimization invocation ever happens.
 *
 * Net effect: identical visual/markup behaviour to the optimized build, but
 * zero image-optimization quota usage.
 */
export default function imageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Already an absolute URL (R2 / Supabase / any https origin): serve as-is.
  if (/^https?:\/\//i.test(src) || src.startsWith('//') || src.startsWith('data:')) {
    return src;
  }
  // Local/public asset (e.g. "/logo.png"): return the path untouched so it is
  // served directly from /public instead of through the optimizer.
  return src;
}
