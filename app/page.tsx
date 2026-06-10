import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
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

  return (
    <HomeContent
      products={products ?? []}
      stores={stores ?? []}
      categories={categories ?? []}
    />
  );
}
