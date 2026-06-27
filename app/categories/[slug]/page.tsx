import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import ProductsLazyGrid from '@/components/ProductsLazyGrid';
import CroppedImage from '@/components/CroppedImage';
import { Package } from 'lucide-react';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!category) notFound();

  const { data: productsRaw } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('category_id', category.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  // Filter out products whose store isn't approved/active/within activation period
  const products = (productsRaw ?? []).filter((p: any) => p.store && isStoreOpen(p.store));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {category.image_url ? (
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-luxor-obsidian shadow-luxor">
          <div className="relative aspect-[16/7] md:aspect-[16/5]">
            <CroppedImage
              src={category.image_url}
              crop={category.image_meta}
              alt={category.name_ar}
              sizes="(max-width: 1024px) 100vw, 1024px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/90 via-luxor-obsidian/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
              <h1 className="text-3xl font-black text-white md:text-5xl">{category.name_ar}</h1>
              <p className="mt-1 text-sm uppercase tracking-wide text-luxor-goldlight/80">{category.name_en}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center mb-10">
          <div className="text-6xl mb-3">{category.icon}</div>
          <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-1">{category.name_ar}</h1>
          <p className="text-luxor-navy/70">{category.name_en}</p>
        </div>
      )}

      {!products?.length ? (
        <div className="card p-10 text-center">
          <Package className="mx-auto text-luxor-gold mb-3" size={48} />
          <p className="text-luxor-navy/70">لا توجد منتجات في هذا القسم بعد</p>
        </div>
      ) : (
        <ProductsLazyGrid products={products as any} />
      )}
    </div>
  );
}
