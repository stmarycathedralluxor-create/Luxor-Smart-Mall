import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Eye, Package, Rows3 } from 'lucide-react';
import CroppedImage from '@/components/CroppedImage';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, discountPercent } from '@/lib/utils';
import DeleteProductButton from './DeleteProductButton';

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
  if (!store) redirect('/dashboard/store');

  const { data: products } = await supabase
    .from('products')
    .select('*, category:categories(*)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-luxor-navy">منتجاتي</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/products/bulk" className="btn-outline !py-2 !px-4 !text-sm">
            <Rows3 size={16} /> إضافة بالجملة
          </Link>
          <Link href="/dashboard/products/new" className="btn-primary !py-2 !px-4 !text-sm">
            <Plus size={16} /> أضف منتج جديد
          </Link>
        </div>
      </div>

      {!products?.length ? (
        <div className="card p-10 text-center">
          <Package className="mx-auto text-luxor-gold mb-4" size={48} />
          <p className="text-luxor-navy/70 mb-4">لا توجد منتجات بعد</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Link href="/dashboard/products/new" className="btn-primary inline-flex">
              <Plus size={18} /> أضف أول منتج
            </Link>
            <Link href="/dashboard/products/bulk" className="btn-outline inline-flex">
              <Rows3 size={18} /> إضافة بالجملة
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p: any) => (
            <div key={p.id} className="card p-4">
              <div className="aspect-square relative rounded-lg overflow-hidden bg-luxor-sandlight mb-3">
                {p.images?.[0] ? (
                  <CroppedImage src={p.images[0]} crop={p.images_meta?.[0]} alt={p.title} sizes="(max-width: 640px) 100vw, 33vw" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-luxor-gold">
                    <Package size={40} />
                  </div>
                )}
                {!p.is_available && (
                  <span className="absolute top-2 start-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    غير متاح
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-luxor-navy line-clamp-2 min-h-[3rem]">{p.title}</h3>
              <div className="flex items-center justify-between mt-2 mb-3">
                <span className="text-lg font-bold text-luxor-gold flex items-center gap-2 flex-wrap">
                  {formatPrice(p.price)} ج.م
                  {discountPercent(p.price, p.compare_at_price) !== null && (
                    <>
                      <span className="text-xs text-luxor-navy/40 line-through font-normal">
                        {formatPrice(p.compare_at_price)}
                      </span>
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" dir="ltr">
                        -{discountPercent(p.price, p.compare_at_price)}%
                      </span>
                    </>
                  )}
                </span>
                <span className="flex items-center gap-1 text-xs text-luxor-navy/60">
                  <Eye size={12} /> {p.views}
                </span>
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/products/${p.id}`} className="flex-1 btn-outline !py-2 !text-sm">
                  <Edit size={14} /> تعديل
                </Link>
                <DeleteProductButton productId={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
