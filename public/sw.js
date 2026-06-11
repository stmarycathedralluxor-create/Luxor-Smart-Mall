// Luxor Smart Mall - Service Worker
// v3: STRICT allowlist caching.
//
// v2 used cache-first for every non-navigation GET request. That silently
// cached Next.js RSC payload fetches (client-side navigations like
// /dashboard/products?_rsc=xxx), so after deleting a store/product the SW
// kept serving the OLD page data forever — items appeared to "come back",
// counters froze, and everything felt unpredictable.
//
// Now ONLY a fixed list of truly-static public files is ever cached.
// Everything else (HTML, RSC payloads, API, data) goes straight to the
// network, with a minimal offline fallback for navigations.
const CACHE_NAME = 'luxor-mall-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/logo.png',
  '/apple-touch-icon.png',
  '/favicon-16.png',
  '/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept cross-origin (Supabase, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  // HTML navigations: network-only with a minimal offline fallback.
  // Cached HTML references old hashed chunks and breaks after deploys.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>غير متصل</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0A0A0A;color:#D4AF37;text-align:center}div{padding:24px}</style></head><body><div><h1>لا يوجد اتصال بالإنترنت</h1><p>تحقق من اتصالك ثم أعد المحاولة.</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
      )
    );
    return;
  }

  // STRICT ALLOWLIST: only the fixed static files above are cache-first.
  // RSC payloads, /_next/*, /api/*, and anything dynamic are NOT touched —
  // the browser talks to the network directly so data is always fresh.
  if (!STATIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
