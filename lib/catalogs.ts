import type { SupabaseClient } from '@supabase/supabase-js';
import { isStoreOpen } from '@/lib/utils';
import type { Catalog, ProductWithStore } from '@/lib/types';

/**
 * يحسب قائمة منتجات الكتالوج بناءً على طريقة الاختيار (filter_type):
 *  - all         → كل منتجات المتجر المصدر
 *  - price_high  → الأعلى سعراً
 *  - rating_high → الأعلى تقييماً (يعتمد على get_product_rating؛ يتراجع
 *                  للأحدث إذا لم تُثبَّت دالة التقييمات)
 *  - manual      → المنتجات المختارة يدوياً (جدول catalog_products) مرتّبة
 *
 * نُخفي دائماً منتجات المتاجر غير المعتمدة/المنتهية ونحترم product_limit.
 */
export async function resolveCatalogProducts(
  supabase: SupabaseClient,
  catalog: Catalog
): Promise<ProductWithStore[]> {
  const limit = Math.max(1, Math.min(catalog.product_limit || 24, 100));

  if (catalog.filter_type === 'manual') {
    const { data: links } = await supabase
      .from('catalog_products')
      .select('product_id, position')
      .eq('catalog_id', catalog.id)
      .order('position', { ascending: true });

    const ids = (links ?? []).map((l: any) => l.product_id);
    if (!ids.length) return [];

    const { data: productsRaw } = await supabase
      .from('products')
      .select('*, store:stores(*), category:categories(*)')
      .in('id', ids)
      .eq('is_available', true);

    const byId = new Map<string, ProductWithStore>();
    ((productsRaw ?? []) as ProductWithStore[]).forEach((p: any) => {
      if (p.store && isStoreOpen(p.store)) byId.set(p.id, p);
    });
    // احترم ترتيب الاختيار اليدوي
    return ids.map((id: string) => byId.get(id)).filter(Boolean) as ProductWithStore[];
  }

  // الفلاتر التلقائية تعتمد على متجر مصدر
  const sourceStore = catalog.filter_store_id || catalog.store_id;
  let query = supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('is_available', true);

  if (sourceStore) query = query.eq('store_id', sourceStore);

  if (catalog.filter_type === 'price_high') {
    query = query.order('price', { ascending: false });
  } else {
    // all (الأحدث) و rating_high (نرتّب بالتقييم لاحقاً)
    query = query.order('created_at', { ascending: false });
  }

  const { data: productsRaw } = await query.limit(catalog.filter_type === 'rating_high' ? 200 : limit);

  let list = ((productsRaw ?? []) as ProductWithStore[]).filter(
    (p: any) => p.store && isStoreOpen(p.store)
  );

  if (catalog.filter_type === 'rating_high') {
    // اجلب تقييمات المنتجات وافرزها تنازلياً (يتراجع للأحدث عند غياب الدالة)
    const ratings = await Promise.all(
      list.map(async (p) => {
        try {
          const { data } = await supabase.rpc('get_product_rating', { p_product_id: p.id });
          const r = data && data[0];
          return {
            id: p.id,
            avg: Number(r?.avg_rating) || 0,
            count: Number(r?.review_count) || 0,
          };
        } catch {
          return { id: p.id, avg: 0, count: 0 };
        }
      })
    );
    const rmap = new Map(ratings.map((r) => [r.id, r]));
    list = [...list].sort((a, b) => {
      const ra = rmap.get(a.id)!;
      const rb = rmap.get(b.id)!;
      if (rb.avg !== ra.avg) return rb.avg - ra.avg;
      return rb.count - ra.count;
    });
    list = list.slice(0, limit);
  }

  return list;
}
