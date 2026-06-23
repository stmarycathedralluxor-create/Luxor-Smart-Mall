import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import { resolveCatalogProducts } from '@/lib/catalogs';
import HomeContent from '@/components/HomeContent';
import type { HomeCatalogCard } from '@/components/CatalogsCarousel';
import type { Catalog } from '@/lib/types';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: products }, { data: stores }, { data: categories }, catalogsRes, statsRes] =
    await Promise.all([
      supabase
        .from('products')
        .select('*, store:stores(*), category:categories(*)')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('categories').select('*').order('id'),
      // الكتالوجات العامة المعتمدة فقط (يتراجع بهدوء لو الجدول غير موجود)
      supabase
        .from('catalogs')
        .select('*')
        .eq('scope', 'global')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(8)
        .then((r) => r, () => ({ data: null })),
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

  // جهّز كروت الكتالوجات للقطار الأفقي (صورة واحدة لكل منتج عبر CatalogCard)
  let catalogCards: HomeCatalogCard[] = [];
  const catalogsRaw = (catalogsRes?.data as Catalog[] | null) ?? [];
  if (catalogsRaw.length) {
    // اجلب المتاجر المرتبطة منفصلاً (لتفادي سلوك inner join مع RLS)
    const storeIds = Array.from(
      new Set(catalogsRaw.map((c) => c.store_id).filter(Boolean))
    ) as string[];
    const storeMap = new Map<string, any>();
    if (storeIds.length) {
      const { data: catStores } = await supabase.from('stores').select('*').in('id', storeIds);
      (catStores ?? []).forEach((s: any) => storeMap.set(s.id, s));
    }

    const resolved = await Promise.all(
      catalogsRaw.map(async (c) => {
        const catProducts = await resolveCatalogProducts(supabase, c);
        const store = c.store_id ? storeMap.get(c.store_id) ?? null : null;
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          count: catProducts.length,
          products: catProducts,
          store: store
            ? { name: store.name, slug: store.slug, logo_url: store.logo_url ?? null }
            : null,
        } as HomeCatalogCard;
      })
    );
    // أخفِ الكتالوجات الفارغة
    catalogCards = resolved.filter((c) => c.count > 0);
  }

  return (
    <HomeContent
      products={openProducts}
      stores={openStores}
      categories={categories ?? []}
      catalogs={catalogCards}
      siteStats={siteStats}
    />
  );
}
