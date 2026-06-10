import { notFound } from 'next/navigation';
import Image from 'next/image';
import { MapPin, Store as StoreIcon, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ProductCard from '@/components/ProductCard';
import WhatsAppButton from '@/components/WhatsAppButton';
import { Package } from 'lucide-react';

export const revalidate = 60;

export default async function StorePage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .eq('is_approved', true)
    .maybeSingle();

  if (!store) notFound();

  // Track the store visit (fire & forget; RLS allows insert from anon)
  supabase.rpc('track_store_visit', { p_store_id: store.id, p_session_id: null });

  const { data: products } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  return (
    <div>
      {/* Cover */}
      <div className="relative aspect-[16/5] md:aspect-[16/4] bg-gradient-to-br from-luxor-navy to-luxor-gold">
        {store.cover_url ? (
          <Image src={store.cover_url} alt={store.name} fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <StoreIcon size={80} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-luxor-navy/80 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative">
        {/* Store info card */}
        <div className="card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg shrink-0 -mt-16 md:-mt-20 bg-white relative">
              {store.logo_url ? (
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  fill
                  sizes="(max-width: 768px) 96px, 128px"
                  className="object-contain p-1"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-luxor-gold flex items-center justify-center text-luxor-navy font-bold text-3xl">
                  {store.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-luxor-navy">{store.name}</h1>
              {store.city && (
                <p className="text-luxor-navy/60 mt-1 flex items-center gap-1">
                  <MapPin size={14} /> {store.city}
                </p>
              )}
              {store.description && (
                <p className="text-luxor-navy/80 mt-3">{store.description}</p>
              )}
              <div className="mt-4">
                <WhatsAppButton
                  phone={store.whatsapp}
                  message={`السلام عليكم، أتواصل معكم من لوكسور سمارت مول بخصوص متجركم ${store.name}`}
                  label="تواصل عبر واتساب"
                />
              </div>
            </div>

            <div className="text-center md:text-end">
              <div className="text-3xl font-bold text-luxor-gold">{products?.length ?? 0}</div>
              <div className="text-sm text-luxor-navy/60">منتج</div>
            </div>
          </div>
        </div>

        {/* Products */}
        <h2 className="text-2xl font-bold text-luxor-navy mb-6">منتجات المتجر</h2>

        {!products?.length ? (
          <div className="card p-10 text-center">
            <Package className="mx-auto text-luxor-gold mb-3" size={48} />
            <p className="text-luxor-navy/70">لا توجد منتجات في هذا المتجر بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 pb-16">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
