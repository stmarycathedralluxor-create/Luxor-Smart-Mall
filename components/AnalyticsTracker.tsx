'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SESSION_KEY = 'lsm_session_id';
const DAY_SEEN_KEY = 'lsm_last_visit_day';

function uuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as any).randomUUID();
  }
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id: string = localStorage.getItem(SESSION_KEY) ?? '';
  if (!id) {
    id = uuid();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function shouldCountVisitToday(): boolean {
  if (typeof window === 'undefined') return false;
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(DAY_SEEN_KEY);
  if (last === today) return false;
  localStorage.setItem(DAY_SEEN_KEY, today);
  return true;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const counted = useRef(false);

  useEffect(() => {
    // Avoid double-count within the same SPA navigation cycle.
    // We only count a "site visit" once per day per browser; navigation between
    // pages is not counted again. This keeps the counter realistic.
    if (counted.current) return;
    if (!shouldCountVisitToday()) return;

    counted.current = true;
    const supabase = createClient();
    const sess = getSessionId();
    // fire & forget — ignore errors silently
    void (async () => {
      try {
        await supabase.rpc('track_site_visit', {
          p_session_id: sess,
          p_path: pathname || '/',
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        });
      } catch {
        /* noop */
      }
    })();
  }, [pathname]);

  return null;
}
