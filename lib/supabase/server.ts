import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // CRITICAL: Next.js 14 patches global fetch and may CACHE Supabase
        // REST responses (fetch defaults to force-cache on static routes).
        // That made server components render stale data (deleted items still
        // visible, counters frozen). Force every Supabase request to bypass
        // the Next.js Data Cache.
        fetch: (input: any, init?: any) => fetch(input, { ...init, cache: 'no-store' }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component – ignore
          }
        },
      },
    }
  );
}
