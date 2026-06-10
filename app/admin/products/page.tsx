import { createClient } from '@/lib/supabase/server';
import ProductRow from './ProductRow';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from('products')
    .select('*, store:stores(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-luxor-sand/60">
        <h2 className="font-bold text-luxor-navy">المنتجات ({products?.length ?? 0})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-luxor-sandlight text-luxor-navy">
            <tr>
              <th className="text-start p-3">المنتج</th>
              <th className="text-start p-3">المتجر</th>
              <th className="text-start p-3">السعر</th>
              <th className="text-start p-3">المشاهدات</th>
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
