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
  // عدد غير محدود: لا سقف أعلى. إن لم يُحدَّد حد نستخدم رقماً كبيراً جداً
  // ليشمل كل منتجات المتجر دون اقتطاع.
  const limit = Math.max(1, catalog.product_limit || 100000);

  // يربط المتجر والفئة بكل منتج عبر استعلامات منفصلة (لا embedded join)
  // لأن الربط الداخلي يتصرّف كـ inner join فيحذف المنتجات بصمت عندما
  // تمنع RLS قراءة المتجر — فيظهر الكتالوج فارغاً رغم وجود منتجاته.
  async function attachStoresAndCategories(rows: any[]): Promise<ProductWithStore[]> {
    if (!rows.length) return [];
    const sIds = Array.from(new Set(rows.map((p) => p.store_id).filter(Boolean)));
    const cIds = Array.from(new Set(rows.map((p) => p.category_id).filter(Boolean)));
    const [storesRes, catsRes] = await Promise.all([
      sIds.length
        ? supabase.from('stores').select('*').in('id', sIds)
        : Promise.resolve({ data: [] as any[] }),
      cIds.length
        ? supabase.from('categories').select('*').in('id', cIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const sMap = new Map<any, any>(((storesRes as any).data ?? []).map((s: any) => [s.id, s]));
    const cMap = new Map<any, any>(((catsRes as any).data ?? []).map((c: any) => [c.id, c]));
    return rows.map((p) => ({
      ...p,
      store: p.store_id ? sMap.get(p.store_id) ?? null : null,
      category: p.category_id ? cMap.get(p.category_id) ?? null : null,
    })) as ProductWithStore[];
  }

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
      .select('*')
      .in('id', ids)
      .eq('is_available', true);

    const withRel = await attachStoresAndCategories((productsRaw ?? []) as any[]);
    const byId = new Map<string, ProductWithStore>();
    withRel.forEach((p: any) => {
      if (p.store && isStoreOpen(p.store)) byId.set(p.id, p);
    });
    // احترم ترتيب الاختيار اليدوي
    return ids.map((id: string) => byId.get(id)).filter(Boolean) as ProductWithStore[];
  }

  // الفلاتر التلقائية تعتمد على متجر مصدر
  const sourceStore = catalog.filter_store_id || catalog.store_id;
  let query = supabase
    .from('products')
    .select('*')
    .eq('is_available', true);

  if (sourceStore) query = query.eq('store_id', sourceStore);

  if (catalog.filter_type === 'price_high') {
    query = query.order('price', { ascending: false });
  } else {
    // all (الأحدث) و rating_high (نرتّب بالتقييم لاحقاً)
    query = query.order('created_at', { ascending: false });
  }

  // للأعلى تقييماً نجلب كل المنتجات المرشّحة ثم نرتّبها ونقتطع لاحقاً.
  const { data: productsRaw } = await query.limit(catalog.filter_type === 'rating_high' ? 100000 : limit);

  const withRel = await attachStoresAndCategories((productsRaw ?? []) as any[]);
  let list = withRel.filter((p: any) => p.store && isStoreOpen(p.store));

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
