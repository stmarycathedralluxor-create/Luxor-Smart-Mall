import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '../ProductForm';

export default async function NewProductPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
  if (!store) redirect('/dashboard/store');

  const { data: categories } = await supabase.from('categories').select('*').order('id');

  return (
    <div>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">إضافة منتج جديد</h1>
      <ProductForm storeId={store.id} userId={user.id} categories={categories ?? []} />
    </div>
  );
}
