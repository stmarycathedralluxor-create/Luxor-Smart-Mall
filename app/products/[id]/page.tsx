import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Store as StoreIcon, Eye, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import ProductGallery from '@/components/ProductGallery';
import WhatsAppButton from '@/components/WhatsAppButton';
import { formatPrice } from '@/lib/utils';

export const revalidate = 30;

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('id', params.id)
    .maybeSingle();

  if (!product || !product.store) notFound();

  // Increment views (fire & forget)
  supabase.rpc('increment_product_views', { product_id: product.id });

  const message = `السلام عليكم، أهتم بشراء المنتج التالي من متجر "${product.store.name}":\n\n*${product.title}*\nالسعر: ${formatPrice(product.price)} ج.م\n\nرابط المنتج: ${process.env.NEXT_PUBLIC_SITE_URL || ''}/products/${product.id}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="text-sm text-luxor-navy/60 mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-luxor-gold">الرئيسية</Link>
        <span>/</span>
        <Link href="/stores" className="hover:text-luxor-gold">المتاجر</Link>
        <span>/</span>
        <Link href={`/stores/${product.store.slug}`} className="hover:text-luxor-gold">{product.store.name}</Link>
        <span>/</span>
        <span className="text-luxor-navy/80">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductGallery images={product.images} title={product.title} />

        <div className="flex flex-col">
          {product.category && (
            <Link
              href={`/categories/${product.category.slug}`}
              className="inline-flex items-center gap-1 text-sm text-luxor-gold font-medium w-fit mb-2"
            >
              <Tag size={14} />
              {product.category.icon} {product.category.name_ar}
            </Link>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-3">{product.title}</h1>

          <div className="flex items-center gap-4 text-sm text-luxor-navy/60 mb-6">
            <span className="flex items-center gap-1">
              <Eye size={14} /> {product.views} مشاهدة
            </span>
            {!product.is_available && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                غير متاح حالياً
              </span>
            )}
          </div>

          <div className="card p-6 mb-6 bg-gradient-to-br from-luxor-sandlight to-white">
            <div className="text-sm text-luxor-navy/70 mb-1">السعر</div>
            <div className="text-4xl md:text-5xl font-bold text-luxor-gold">
              {formatPrice(product.price)}
              <span className="text-xl text-luxor-navy/60 ms-2">ج.م</span>
            </div>
          </div>

          {product.description && (
            <div className="mb-6">
              <h3 className="font-bold text-luxor-navy mb-2">وصف المنتج</h3>
              <p className="text-luxor-navy/80 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Seller card */}
          <Link
            href={`/stores/${product.store.slug}`}
            className="card p-4 flex items-center gap-3 mb-6 hover:border-luxor-gold"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-luxor-gold flex items-center justify-center shrink-0">
              {product.store.logo_url ? (
                <Image src={product.store.logo_url} alt={product.store.name} width={56} height={56} className="object-cover" />
              ) : (
                <span className="text-luxor-navy font-bold text-xl">{product.store.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-xs text-luxor-navy/60">البائع</div>
              <div className="font-bold text-luxor-navy">{product.store.name}</div>
              {product.store.city && (
                <div className="text-xs text-luxor-navy/60 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} /> {product.store.city}
                </div>
              )}
            </div>
            <StoreIcon className="text-luxor-gold" size={20} />
          </Link>

          {/* WhatsApp CTA */}
          {product.is_available && (
            <div className="space-y-3">
              <WhatsAppButton
                phone={product.store.whatsapp}
                message={message}
                label="اطلب الآن عبر واتساب"
                className="w-full !text-base !py-4"
              />
              <p className="text-xs text-center text-luxor-navy/60">
                ستتواصل مباشرة مع البائع لإتمام الطلب والدفع والتسليم
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
