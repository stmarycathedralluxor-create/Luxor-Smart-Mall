import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import BrowseAllView from '../BrowseAllView';
import type { ProductWithStore } from '@/lib/types';

// Always render fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'تصفّح كل المنتجات | الأقصر سمارت مول',
  description: 'تصفّح كل منتجات الأقصر سمارت مول بطريقة عرض عصرية كأنها مجلة — فلاتر، أقسام، براندات ونطاقات أسعار.',
};

export default async function BrowseAllPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const supabase = createClient();

  const [{ data: productsRaw }, { data: categories }, { data: storesRaw }] = await Promise.all([
    supabase
      .from('products')
      .select('*, store:stores(*), category:categories(*)')
      .eq('is_available', true)
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*').order('id'),
    supabase
      .from('stores')
      .select('id, name, slug, is_active, is_approved, expires_at')
      .eq('is_active', true)
      .eq('is_approved', true),
  ]);

  const products = ((productsRaw ?? []) as ProductWithStore[]).filter(
    (p: any) => p.store && isStoreOpen(p.store)
  );

  const storeIds = new Set(products.map((p) => p.store_id));
  const stores = (storesRaw ?? []).filter((s: any) => storeIds.has(s.id));

  const brands = Array.from(
    new Set(products.map((p) => (p.brand || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ar'));

  return (
    <BrowseAllView
      products={products}
      categories={categories ?? []}
      stores={stores as any}
      brands={brands}
      initialFilters={{
        q: searchParams.q ?? '',
        category: searchParams.category ?? '',
        brand: searchParams.brand ?? '',
        store: searchParams.store ?? '',
        sort: searchParams.sort ?? 'newest',
        min: searchParams.min ?? '',
        max: searchParams.max ?? '',
        preset: searchParams.preset ?? '',
      }}
    />
  );
}
