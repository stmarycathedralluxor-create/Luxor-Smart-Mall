/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
