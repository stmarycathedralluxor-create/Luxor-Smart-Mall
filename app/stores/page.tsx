import { createClient } from '@/lib/supabase/server';
import StoreCard from '@/components/StoreCard';
import { Store as StoreIcon } from 'lucide-react';

export const revalidate = 60;

export default async function StoresPage() {
  const supabase = createClient();
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  // count products per store
  const ids = (stores ?? []).map((s) => s.id);
  const { data: counts } = ids.length
    ? await supabase.from('products').select('store_id').in('store_id', ids)
    : { data: [] };
  const countMap = new Map<string, number>();
  (counts ?? []).forEach((c: any) => countMap.set(c.store_id, (countMap.get(c.store_id) ?? 0) + 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-3">جميع المتاجر</h1>
        <p className="text-luxor-navy/70">اكتشف متاجر الأقصر المميزة</p>
      </div>

      {!stores?.length ? (
        <div className="card p-10 text-center">
          <StoreIcon className="mx-auto text-luxor-gold mb-3" size={48} />
          <p className="text-luxor-navy/70">لا توجد متاجر بعد. كن أول من ينشئ متجراً!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((s) => (
            <StoreCard key={s.id} store={s} productCount={countMap.get(s.id) ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
