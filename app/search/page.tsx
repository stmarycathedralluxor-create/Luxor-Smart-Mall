import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import { Search } from 'lucide-react';
import SearchBar from './SearchBar';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  const supabase = createClient();

  let products: any[] = [];
  if (q) {
    const { data } = await supabase
      .from('products')
      .select('*, store:stores(*), category:categories(*)')
      .eq('is_available', true)
      .or(`title.ilike.%${q}%,description.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(48);
    products = (data ?? []).filter(
      (p: any) => p.store?.is_active && p.store?.is_approved
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-luxor-navy mb-4">بحث</h1>
        <SearchBar initialQuery={q ?? ''} />
      </div>

      {q && (
        <>
          <p className="text-luxor-navy/70 mb-6 text-center">
            {products.length} نتيجة للبحث عن "<strong className="text-luxor-navy">{q}</strong>"
          </p>
          {products.length === 0 ? (
            <div className="card p-10 text-center">
              <Search className="mx-auto text-luxor-gold mb-3" size={48} />
              <p className="text-luxor-navy/70">لا توجد نتائج. جرّب كلمات أخرى</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
