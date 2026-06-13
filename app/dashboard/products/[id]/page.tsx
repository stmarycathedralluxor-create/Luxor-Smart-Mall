import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductForm from '../ProductForm';

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
  if (!store) redirect('/dashboard/store');

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', params.id)
    .eq('store_id', store.id)
    .maybeSingle();

  if (!product) notFound();

  const { data: categories } = await supabase.from('categories').select('*').order('id');

  // براندات المتجر المسجّلة (إن وجدت — تتجاهل بأمان لو الترحيل 0012 لم يُشغّل بعد)
  let brands: any[] = [];
  try {
    const { data } = await supabase
      .from('brands')
      .select('*')
      .eq('store_id', store.id)
      .order('name');
    brands = data ?? [];
  } catch {
    /* brands table not installed yet */
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">تعديل المنتج</h1>
      <ProductForm
        storeId={store.id}
        userId={user.id}
        categories={categories ?? []}
        brands={brands}
        initialProduct={product}
      />
    </div>
  );
}
