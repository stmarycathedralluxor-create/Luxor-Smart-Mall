/**
 * Smart image loader for next/image.
 *
 * Why this exists
 * ---------------
 * We deliberately avoid Vercel's on-demand Image Optimization API (the
 * `/_next/image?...` endpoint) because every transformation it serves counts
 * against the limited free-tier quota.
 *
 * The naive way to do that is `images.unoptimized: true`, but that flag also
 * makes next/image stop emitting a `srcset` and the intrinsic responsive
 * markup. Several layouts here (wide desktop views that rely on the `sizes`
 * prop, `fill` + `object-*`, and the lightbox) depend on that markup, and
 * dropping it caused images to render at the wrong size or not show up.
 *
 * A custom `loader` keeps next/image's full responsive behaviour intact
 * (it still builds `srcset`/`sizes`, layout boxes, lazy-loading, etc.) while
 * letting US decide the final URL.
 *
 * Performance (the slow-image problem, esp. iOS)
 * ----------------------------------------------
 * Previously this loader returned the *original* URL unchanged, so a product
 * thumbnail shown at 200px still downloaded the full multi-megapixel upload.
 * On mobile (and Safari/iOS in particular) that means megabytes per card and
 * very slow first paint.
 *
 * Now, when the image lives on a Cloudflare-backed origin that supports
 * **Cloudflare Image Resizing** (a custom domain / Cloudflare zone), we rewrite
 * the URL to the `/cdn-cgi/image/<options>/<source>` form so the edge serves a
 * correctly sized, auto-format (WebP/AVIF) image. This is served straight from
 * Cloudflare's edge cache and does NOT touch Vercel's optimizer quota.
 *
 * Safety: `r2.dev` public buckets and Supabase Storage do NOT support
 * `/cdn-cgi/image/`, so for those origins we fall back to the original URL
 * unchanged (identical to the old behaviour) — nothing breaks.
 */

/**
 * Hostnames that support Cloudflare Image Resizing via `/cdn-cgi/image/`.
 * A custom R2 domain put behind Cloudflare supports it; the default
 * `pub-xxxx.r2.dev` and Supabase do not.
 *
 * We derive the allowed host from NEXT_PUBLIC_R2_PUBLIC_URL, but only when it
 * is NOT an `r2.dev` URL (those can't resize). You can additionally force
 * enable it with NEXT_PUBLIC_CF_IMAGE_RESIZING=1 / =0 to override.
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

  // Only rewrite images that live on the resize-capable Cloudflare host.
  if (host && url.hostname === host && !url.pathname.startsWith('/cdn-cgi/')) {
    const q = Math.min(Math.max(quality ?? 75, 1), 100);
    // Cap width to a sane maximum so the srcset never asks the edge for an
    // absurdly large render.
    const w = Math.min(Math.max(Math.round(width) || 256, 16), 2048);
    const opts = `width=${w},quality=${q},format=auto,fit=scale-down`;
    // Path AFTER the options must be the absolute source URL (encoded) or an
    // origin-relative path. Origin-relative keeps it on the same zone, which is
    // what we want here.
    const sourcePath = url.pathname + url.search;
    return `${url.origin}/cdn-cgi/image/${opts}${sourcePath}`;
  }

  // r2.dev / Supabase / any other origin: serve straight from the CDN.
  return src;
}
