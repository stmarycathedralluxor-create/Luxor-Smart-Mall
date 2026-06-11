import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import HomeContent from '@/components/HomeContent';

export const revalidate = 60; // ISR every 60s

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: products }, { data: stores }, { data: categories }] = await Promise.all([
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
  ]);

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
    />
  );
}
