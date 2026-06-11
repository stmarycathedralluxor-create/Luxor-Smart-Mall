'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Global anti-stale guard.
 *
 * Browsers (especially mobile Chrome/Safari) restore whole pages from the
 * Back/Forward Cache (BFCache) without hitting the network. After deleting a
 * store/product and pressing "back", the user saw the OLD page with the
 * deleted item still there — making the app feel unpredictable.
 *
 * This component forces a server data refresh whenever:
 *  1. The page is restored from the BFCache (`pageshow` with persisted=true)
 *  2. The tab becomes visible again after being hidden for a while
 *     (the data on screen may be minutes old)
 */
export default function FreshnessGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let hiddenAt = 0;

    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Restored from BFCache → the HTML/data on screen is stale
        router.refresh();
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (document.visibilityState === 'visible' && hiddenAt) {
        // Refresh if the tab was hidden for more than 30s
        if (Date.now() - hiddenAt > 30_000) {
          router.refresh();
        }
        hiddenAt = 0;
      }
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router]);

  // Also refresh server data whenever the route itself changes — combined
  // with staleTimes:0 this guarantees no stale Router Cache entry is shown.
  useEffect(() => {
    // no-op: pathname dependency keeps this in sync; the Router Cache is
    // already disabled via next.config staleTimes. Kept for future hooks.
  }, [pathname]);

  return null;
}
