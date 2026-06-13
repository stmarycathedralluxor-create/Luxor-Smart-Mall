import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BulkProductForm from './BulkProductForm';

export const dynamic = 'force-dynamic';

export default async function BulkProductsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!store) redirect('/dashboard/store');

  const { data: categories } = await supabase.from('categories').select('*').order('id');

  // Registered store brands (ignored safely if migration 0012 hasn't run yet)
  let brands: any[] = [];
  try {
    const { data } = await supabase.from('brands').select('*').eq('store_id', store.id).order('name');
    brands = data ?? [];
  } catch {
    /* brands table not installed yet */
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl font-bold text-luxor-navy">إضافة منتجات بالجملة</h1>
        <Link href="/dashboard/products" className="btn-outline !py-2 !px-4 !text-sm">
          <ArrowRight size={16} /> العودة للمنتجات
        </Link>
      </div>
      <p className="text-sm text-luxor-navy/60 mb-6">
        أضف عدة منتجات دفعة واحدة كأنها جدول — كل صف منتج بكل تفاصيله. يمكنك تطبيق معلومة واحدة (لون،
        طريقة التوصيل، القسم…) على جميع المنتجات بضغطة واحدة.
      </p>
      <BulkProductForm storeId={store.id} userId={user.id} categories={categories ?? []} brands={brands} />
    </div>
  );
}
