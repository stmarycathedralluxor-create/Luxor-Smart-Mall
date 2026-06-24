/**
 * Smart image loader for next/image — NO Vercel image optimization.
 *
 * Why this exists
 * ---------------
 * We deliberately avoid Vercel's on-demand Image Optimization API (the
 * `/_next/image?...` endpoint) because every transformation it serves counts
 * against the limited free-tier quota.
 *
 * `images.unoptimized: true` would also strip the responsive `srcset` and the
 * intrinsic sizing markup next/image emits, which several layouts rely on
 * (wide desktop views using `sizes`, `fill` + `object-*`, the lightbox).
 * A custom `loader` keeps that full responsive behaviour while letting US pick
 * the final URL — so the bytes always come straight from the origin CDN and
 * NO Vercel optimization invocation ever happens.
 *
 * Performance (slow images, especially iOS)
 * -----------------------------------------
 * Previously this loader returned the *original* URL unchanged, so a thumbnail
 * shown at 200px still downloaded the full multi-megapixel upload — megabytes
 * per image, slow first paint on mobile/Safari.
 *
 * When the image lives on a Cloudflare-backed origin that supports
 * **Cloudflare Image Resizing** (a custom domain on a Cloudflare zone), we now
 * rewrite the URL to `/cdn-cgi/image/<options>/<source>` so the edge serves a
 * correctly sized, auto-format (WebP/AVIF) image. This is delivered straight
 * from Cloudflare's edge cache and does NOT touch Vercel's optimizer quota.
 *
 * Safe fallback: `pub-*.r2.dev` public buckets and Supabase Storage do NOT
 * support `/cdn-cgi/image/`, so for those origins we return the original URL
 * unchanged (identical to the old behaviour) — nothing breaks.
 */

/**
 * Hostname that supports Cloudflare Image Resizing via `/cdn-cgi/image/`.
 * Derived from NEXT_PUBLIC_R2_PUBLIC_URL, but only when it is NOT an `r2.dev`
 * URL (those can't resize). Force on/off with NEXT_PUBLIC_CF_IMAGE_RESIZING.
 */
function cfResizeHost(): string | null {
  const force = process.env.NEXT_PUBLIC_CF_IMAGE_RESIZING;
  if (force === '0') return null;

  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  let host: string;
  try {
    host = new URL(base).hostname;
  } catch {
    return null;
  }
  // Default r2.dev buckets can't do Image Resizing → skip (unless forced on).
  if (/\.r2\.dev$/i.test(host) && force !== '1') return null;
  return host;
}

export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // Local/public asset (e.g. "/logo.png") or data URI: serve as-is.
  if (!/^https?:\/\//i.test(src)) return src;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  const host = cfResizeHost();

  // Only rewrite images on the resize-capable Cloudflare host.
  if (host && url.hostname === host && !url.pathname.startsWith('/cdn-cgi/')) {
    const q = Math.min(Math.max(quality ?? 75, 1), 100);
    const w = Math.min(Math.max(Math.round(width) || 256, 16), 2048);
    const opts = `width=${w},quality=${q},format=auto,fit=scale-down`;
    return `${url.origin}/cdn-cgi/image/${opts}${url.pathname}${url.search}`;
  }

  // ── Supabase Storage: use Supabase's OWN image transformer ──────────────
  // Legacy images still hosted on Supabase load at full resolution otherwise,
  // which is the #1 cause of slow first paint on iOS / Safari (a 200px
  // thumbnail still downloads the multi-megapixel original).
  //
  // Supabase Storage exposes a native render/transform endpoint:
  //   /storage/v1/render/image/public/<bucket>/<path>?width=&quality=&resize=
  // This is served by Supabase (NOT Cloudflare's /cdn-cgi/image and NOT
  // Vercel's /_next/image), so it adds nothing to either provider's quota.
  // We just rewrite the public object URL to the render URL and append the
  // width next/image is actually asking for, capped at the 2000px we store.
  if (/\.supabase\.(co|in)$/i.test(url.hostname)) {
    const objectMatch = url.pathname.match(
      /^\/storage\/v1\/object\/public\/(.+)$/
    );
    if (objectMatch) {
      const q = Math.min(Math.max(quality ?? 70, 20), 100);
      const w = Math.min(Math.max(Math.round(width) || 256, 16), 2000);
      const params = new URLSearchParams(url.search);
      params.set('width', String(w));
      params.set('quality', String(q));
      // scale-down: never upscale beyond the stored original (saves bytes,
      // keeps sharpness on retina screens via next/image's srcset widths).
      params.set('resize', 'contain');
      return `${url.origin}/storage/v1/render/image/public/${objectMatch[1]}?${params.toString()}`;
    }
    return src;
  }

  // r2.dev / any other origin (e.g. pub-*.r2.dev which can't resize at the
  // edge): serve straight from the CDN. Uploads are already capped at 2000px
  // / ~220 KB WebP, and CroppedImage adds lazy/async decoding so iOS doesn't
  // block painting on these.
  return src;
}
