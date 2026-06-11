'use client';

/**
 * Client-side trackers for product views & store visits.
 *
 * Why client-side? The old implementation called the RPC from the server
 * component WITHOUT awaiting it, so the request was usually dropped before
 * completing. Store pages also use ISR caching (revalidate=60), meaning the
 * server code doesn't even run on most visits. Firing from the browser
 * guarantees every real visit is counted, deduped per browser session.
 */

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const SESSION_KEY = 'lsm_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY) ?? '';
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? (crypto as any).randomUUID()
        : 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Dedupe: count each item once per browser tab session. */
function alreadyTracked(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
    return false;
  } catch {
    return false;
  }
}

export function ProductViewTracker({ productId }: { productId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !productId) return;
    fired.current = true;
    if (alreadyTracked(`lsm_pv_${productId}`)) return;
    const supabase = createClient();
    void (async () => {
      try {
        await supabase.rpc('increment_product_views', { product_id: productId });
      } catch {
        /* noop */
      }
    })();
  }, [productId]);

  return null;
}

export function StoreVisitTracker({ storeId }: { storeId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !storeId) return;
    fired.current = true;
    if (alreadyTracked(`lsm_sv_${storeId}`)) return;
    const supabase = createClient();
    void (async () => {
      try {
        await supabase.rpc('track_store_visit', {
          p_store_id: storeId,
          p_session_id: getSessionId(),
        });
      } catch {
        /* noop */
      }
    })();
  }, [storeId]);

  return null;
}
