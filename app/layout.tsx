import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { LocaleProvider } from '@/components/LocaleProvider';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import FreshnessGuard from '@/components/FreshnessGuard';
import { siteUrl } from '@/lib/utils';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  // Canonical base for every relative OG/Twitter image & canonical link.
  // Normalized (no www.) so share links are always consistent.
  metadataBase: new URL(siteUrl()),
  title: 'الأقصر سمارت مول | Luxor Smart Mall',
  description: 'سوق الأقصر الذكي - منصة تجمع بائعي ومشتري الأقصر | The Smart Marketplace of Luxor',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Luxor Smart Mall',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'الأقصر سمارت مول',
    description: 'سوق الأقصر الذكي',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0A" />
      </head>
      <body className="min-h-screen flex flex-col pattern-egyptian">
        <LocaleProvider>
          <AnalyticsTracker />
          <FreshnessGuard />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LocaleProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then((reg) => {
                    // Check for a new SW on every page load so deployments
                    // propagate quickly instead of serving stale assets.
                    reg.update().catch(() => {});
                  }).catch(() => {});
                  // Reload once when a new service worker takes control,
                  // so the page always matches the latest deployment.
                  let refreshed = false;
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshed) return;
                    refreshed = true;
                    window.location.reload();
                  });
                });
              }
              // Recovery: if a hashed JS/CSS chunk from an old deployment
              // fails to load (404 after redeploy), clear caches + SW and
              // reload once to fetch the fresh HTML/chunks.
              (function () {
                const KEY = 'lsm_chunk_reload_at';
                function recover() {
                  try {
                    const last = +(sessionStorage.getItem(KEY) || 0);
                    if (Date.now() - last < 30000) return; // avoid reload loops
                    sessionStorage.setItem(KEY, String(Date.now()));
                  } catch (e) {}
                  const work = [];
                  if ('caches' in window) {
                    work.push(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {}));
                  }
                  if ('serviceWorker' in navigator) {
                    work.push(navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))).catch(() => {}));
                  }
                  Promise.all(work).finally(() => window.location.reload());
                }
                window.addEventListener('error', (e) => {
                  const t = e.target;
                  if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {
                    const src = t.src || t.href || '';
                    if (src.indexOf('/_next/static/') !== -1) recover();
                  }
                }, true);
                window.addEventListener('unhandledrejection', (e) => {
                  const msg = (e.reason && (e.reason.message || String(e.reason))) || '';
                  if (/Loading chunk|ChunkLoadError|Failed to fetch dynamically imported module/i.test(msg)) recover();
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
