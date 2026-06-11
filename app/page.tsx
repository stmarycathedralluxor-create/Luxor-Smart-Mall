import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import HomeContent from '@/components/HomeContent';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: products }, { data: stores }, { data: categories }, statsRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, store:stores(*), category:categories(*)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('stores')
      .select('*')
      .eq('is_active', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('categories').select('*').order('id'),
    // Public site stats (gracefully degrades if migration 0006 hasn't run)
    supabase.rpc('get_public_site_stats').then((r) => r, () => ({ data: null })),
  ]);

  const siteStats =
    (statsRes?.data as { site_visits: number; store_visits: number; product_views: number } | null) ??
    { site_visits: 0, store_visits: 0, product_views: 0 };

  // Hide products/stores whose activation period expired
  const openStores = (stores ?? []).filter((s) => isStoreOpen(s));
  const openProducts = (products ?? []).filter(
    (p: any) => p.store && isStoreOpen(p.store)
  );

  return (
    <HomeContent
      products={openProducts}
      stores={openStores}
      categories={categories ?? []}
      siteStats={siteStats}
    />
  );
}
