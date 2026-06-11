// Luxor Smart Mall - Service Worker
// v2: never cache Next.js build assets or HTML aggressively.
// Stale HTML referencing old /_next/static chunks was crashing the app
// after each deployment ("Application error: a client-side exception").
const CACHE_NAME = 'luxor-mall-v2';
const STATIC_ASSETS = ['/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/logo.png'];

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
  // Never intercept API or any Next.js build/data assets.
  // /_next/static files are content-hashed and change every deployment;
  // serving stale copies (or stale HTML pointing at them) breaks the app.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) return;

  // HTML navigations: network-only with a minimal offline fallback.
  // We intentionally do NOT serve cached HTML when online, because cached
  // pages reference old hashed chunks that no longer exist after a deploy.
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

  // Static public assets (icons, logo, manifest): cache-first is safe.
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
