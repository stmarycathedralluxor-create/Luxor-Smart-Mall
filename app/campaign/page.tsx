import { createClient } from '@/lib/supabase/server';
import CampaignContent from '@/components/CampaignContent';

// Always render fresh data — keeps the live counters in sync with the rest of the site
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'افتح متجرك مجاناً | الأقصر سمارت مول',
  description:
    'انضم لأكبر سوق إلكتروني في الأقصر. افتح متجرك مجاناً، اعرض منتجاتك، واستقبل طلباتك مباشرة على واتساب — بدون رسوم اشتراك ولا عمولة.',
  openGraph: {
    title: 'افتح متجرك مجاناً على الأقصر سمارت مول',
    description:
      'السوق الذكي اللي بيجمع تجّار الأقصر وعملاءهم — طلبات مباشرة على واتساب، بدون عمولة.',
    type: 'website',
  },
};

export default async function CampaignPage() {
  const supabase = createClient();

  const [storesRes, productsRes, statsRes] = await Promise.all([
    // Count active + approved stores (gracefully degrades to 0)
    supabase
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_approved', true)
      .then((r) => r, () => ({ count: 0 })),
    // Count available products
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true)
      .then((r) => r, () => ({ count: 0 })),
    // Public site stats (gracefully degrades if the RPC isn't available)
    supabase.rpc('get_public_site_stats').then((r) => r, () => ({ data: null })),
  ]);

  const siteStats =
    (statsRes?.data as
      | { site_visits: number; store_visits: number; product_views: number }
      | null) ?? { site_visits: 0, store_visits: 0, product_views: 0 };

  return (
    <CampaignContent
      storeCount={(storesRes as any)?.count ?? 0}
      productCount={(productsRes as any)?.count ?? 0}
      siteStats={siteStats}
    />
  );
}
