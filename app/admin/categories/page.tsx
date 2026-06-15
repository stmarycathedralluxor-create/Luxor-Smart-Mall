import { createClient } from '@/lib/supabase/server';
import CategoriesManager from './CategoriesManager';
import type { Category } from '@/lib/types';

// Always show live data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminCategoriesPage() {
  const supabase = createClient();

  const [{ data: categories }, { data: counts }] = await Promise.all([
    supabase.from('categories').select('*').order('id'),
    supabase.from('products').select('category_id'),
  ]);

  const countMap: Record<number, number> = {};
  (counts ?? []).forEach((row: any) => {
    if (row.category_id == null) return;
    countMap[row.category_id] = (countMap[row.category_id] ?? 0) + 1;
  });

  return (
    <CategoriesManager
      initialCategories={(categories ?? []) as Category[]}
      productCounts={countMap}
    />
  );
}
