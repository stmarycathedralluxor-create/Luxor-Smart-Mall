import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import StoreCard from '@/components/StoreCard';
import { Store as StoreIcon, Sparkles, ShieldCheck } from 'lucide-react';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StoresPage() {
  const supabase = createClient();
  const { data: storesRaw } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  // Hide stores whose activation period expired
  const stores = (storesRaw ?? []).filter((s) => isStoreOpen(s));

  // count products per store
  const ids = (stores ?? []).map((s) => s.id);
  const { data: counts } = ids.length
    ? await supabase.from('products').select('store_id').in('store_id', ids)
    : { data: [] };
  const countMap = new Map<string, number>();
  (counts ?? []).forEach((c: any) => countMap.set(c.store_id, (countMap.get(c.store_id) ?? 0) + 1));

  const totalProducts = (counts ?? []).length;
  const totalStores = stores?.length ?? 0;

  return (
    <div className="bg-luxor-sandlight/30 min-h-screen">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian">
        {/* Decorative golden pattern */}
        <div className="absolute inset-0 pattern-egyptian opacity-30" aria-hidden />
        <div
          className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-luxor-gold/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-24 -start-24 w-96 h-96 rounded-full bg-luxor-darkgold/20 blur-3xl"
          aria-hidden
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-luxor-gold/15 border border-luxor-gold/30 text-luxor-goldlight px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4">
              <Sparkles size={12} />
              متاجر رسمية في الأقصر
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
              جميع <span className="text-gold-gradient">المتاجر</span>
            </h1>
            <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto">
              اكتشف متاجر الأقصر المميزة، وتسوّق بثقة من بائعين معتمدين بتجربة فاخرة
            </p>

            {/* Stat pills */}
            {totalStores > 0 && (
              <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-3">
                <div className="bg-white/5 backdrop-blur border border-luxor-gold/20 rounded-2xl px-5 py-3">
                  <div className="text-2xl font-black text-luxor-goldlight">{totalStores}</div>
                  <div className="text-[11px] text-white/60 uppercase tracking-wider">متجر</div>
                </div>
                <div className="bg-white/5 backdrop-blur border border-luxor-gold/20 rounded-2xl px-5 py-3">
                  <div className="text-2xl font-black text-luxor-goldlight">{totalProducts}</div>
                  <div className="text-[11px] text-white/60 uppercase tracking-wider">منتج</div>
                </div>
                <div className="bg-white/5 backdrop-blur border border-luxor-gold/20 rounded-2xl px-5 py-3 inline-flex items-center gap-2">
                  <ShieldCheck size={20} className="text-luxor-goldlight" />
                  <div className="text-[11px] text-white/80 font-semibold leading-tight text-start">
                    جميع المتاجر
                    <br />
                    معتمدة من الإدارة
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* gold accent line */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {!stores?.length ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-luxor-gold/30 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-luxor-gold/10 mb-4">
              <StoreIcon className="text-luxor-gold" size={40} />
            </div>
            <h3 className="text-xl font-bold text-luxor-obsidian mb-2">
              لا توجد متاجر بعد
            </h3>
            <p className="text-luxor-obsidian/60 max-w-md mx-auto">
              كن أول من ينشئ متجراً في لوكسور سمارت مول!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
            {stores.map((s) => (
              <StoreCard key={s.id} store={s} productCount={countMap.get(s.id) ?? 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
