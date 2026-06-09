import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import { Package } from 'lucide-react';

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!category) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('category_id', category.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">{category.icon}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-1">{category.name_ar}</h1>
        <p className="text-luxor-navy/70">{category.name_en}</p>
      </div>

      {!products?.length ? (
        <div className="card p-10 text-center">
          <Package className="mx-auto text-luxor-gold mb-3" size={48} />
          <p className="text-luxor-navy/70">لا توجد منتجات في هذا القسم بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
