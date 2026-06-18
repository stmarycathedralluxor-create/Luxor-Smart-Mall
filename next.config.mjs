/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Avoid Vercel's on-demand Image Optimization API (the `/_next/image`
    // endpoint) so it never consumes the limited free-tier quota.
    //
    // We do this with a custom passthrough `loader` instead of
    // `unoptimized: true`. The difference matters:
    //   • `unoptimized: true` ALSO strips the responsive `srcset` and the
    //     intrinsic sizing markup that next/image normally emits. Several
    //     layouts here (wide desktop views using `sizes`, `fill` +
    //     `object-*`, and the lightbox) relied on that markup, so dropping it
    //     made images render at the wrong size / not show up — mostly on
    //     desktop.
    //   • A custom `loader` keeps the FULL next/image behaviour (srcset,
    //     sizes, layout boxes, lazy loading, placeholders) but lets us return
    //     the original origin URL, so the bytes are served straight from the
    //     CDN (Cloudflare R2 / Supabase) and NO Vercel optimization
    //     invocation is ever billed.
    //
    // See lib/imageLoader.ts. No component code changes are needed and no
    // functionality is lost.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    remotePatterns: [
      // Legacy images still hosted on Supabase Storage (transition period)
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
      // Cloudflare R2 public bucket (r2.dev subdomain or custom domain)
      { protocol: 'https', hostname: '**.r2.dev' },
      ...(process.env.NEXT_PUBLIC_R2_PUBLIC_URL
        ? [{ protocol: 'https', hostname: new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL).hostname }]
        : []),
    ],
    // Images on R2 use unique immutable filenames → cache aggressively
    minimumCacheTTL: 31536000,
  },
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
    // Kill the client-side Router Cache staleness: Next 14 keeps page
    // payloads for 30s (dynamic) / 5min (static) which made deleted or
    // updated items keep showing when navigating around the app.
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  async headers() {
    return [
      {
        // Every page (HTML) response: never let the browser or any proxy
        // cache it. Hashed build assets under /_next/ and public icons are
        // intentionally excluded (they're immutable / safe to cache).
        source: '/((?!_next/|icons/|favicon|manifest\\.json|sw\\.js|logo|apple-touch-icon).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        // The service worker file itself must always be revalidated so new
        // deployments take over immediately.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, must-revalidate, max-age=0' }],
      },
    ];
  },
};

export default nextConfig;
