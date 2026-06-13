import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Store as StoreIcon, Eye, Tag, Zap, CalendarClock, Truck, MapPinned, BadgeCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen, deliveryDaysLabel } from '@/lib/utils';
import ProductGallery from '@/components/ProductGallery';
import ProductVariants from '@/components/ProductVariants';
import PriceReveal from '@/components/PriceReveal';
import CroppedImage from '@/components/CroppedImage';
import Reviews from '@/components/Reviews';
import StarRating from '@/components/StarRating';
import { ProductViewTracker } from '@/components/ViewTrackers';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('id', params.id)
    .maybeSingle();

  if (!product || !product.store) notFound();
  // hide products of unapproved / expired stores from the public
  if (!isStoreOpen(product.store)) {
    notFound();
  }

  // View counting now happens client-side via <ProductViewTracker> —
  // server-side fire-and-forget RPCs were silently dropped & cached by ISR.

  // Rating summary (gracefully degrades if migration 0004 hasn't run yet)
  let avgRating = 0;
  let reviewCount = 0;
  try {
    const { data: rating } = await supabase.rpc('get_product_rating', { p_product_id: product.id });
    if (rating && rating[0]) {
      avgRating = Number(rating[0].avg_rating) || 0;
      reviewCount = Number(rating[0].review_count) || 0;
    }
  } catch {
    /* reviews not installed yet */
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ProductViewTracker productId={product.id} />
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
        <ProductGallery
          images={product.images}
          imagesFull={product.images_full}
          imagesMeta={product.images_meta}
          title={product.title}
        />

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

          {product.brand && (
            <div className="mb-1.5">
              <span className="inline-flex items-center gap-1 bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <BadgeCheck size={12} />
                {product.brand}
              </span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-3">{product.title}</h1>

          <div className="flex items-center gap-4 text-sm text-luxor-navy/60 mb-6 flex-wrap">
            <span className="flex items-center gap-1">
              <Eye size={14} /> {product.views} مشاهدة
            </span>
            {reviewCount > 0 && (
              <a href="#reviews" className="hover:opacity-80 transition">
                <StarRating value={avgRating} size={14} showValue count={reviewCount} />
              </a>
            )}
            {!product.is_available && (
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                غير متاح حالياً
              </span>
            )}
          </div>

          {/* طريقة التوفر: فوري أو حجز مسبق */}
          {product.delivery_type === 'preorder' ? (
            <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
              <span className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                <CalendarClock size={20} />
              </span>
              <div>
                <div className="font-bold text-amber-800">حجز مسبق</div>
                <div className="text-sm text-amber-700">
                  {product.delivery_days
                    ? deliveryDaysLabel(product.delivery_days, 'ar')
                    : 'المنتج يتطلب حجزاً مسبقاً — تواصل مع البائع لمعرفة مدة الوصول'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-300 rounded-xl p-4">
              <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Zap size={20} />
              </span>
              <div>
                <div className="font-bold text-emerald-800">متاح فوراً</div>
                <div className="text-sm text-emerald-700">المنتج متوفر وجاهز للتسليم</div>
              </div>
            </div>
          )}

          {/* خيارات الاستلام */}
          {!!product.fulfillment_options?.length && (
            <div className="mb-6 card p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy mb-3">
                <Truck size={16} className="text-luxor-darkgold" />
                خيارات الاستلام
              </div>
              <div className="flex flex-wrap gap-2">
                {product.fulfillment_options.includes('delivery') && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold">
                    <Truck size={13} />
                    توصيل
                  </span>
                )}
                {product.fulfillment_options.includes('store_pickup') && (
                  <span className="inline-flex items-center gap-1.5 bg-luxor-gold/10 text-luxor-darkgold border border-luxor-gold/40 px-3 py-1.5 rounded-full text-xs font-bold">
                    <StoreIcon size={13} />
                    استلام من المتجر
                  </span>
                )}
                {product.fulfillment_options.includes('address_pickup') && (
                  <span className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 border border-sky-300 px-3 py-1.5 rounded-full text-xs font-bold">
                    <MapPinned size={13} />
                    استلام من عنوان
                  </span>
                )}
              </div>
              {product.fulfillment_options.includes('address_pickup') && product.pickup_address && (
                <div className="mt-3 flex items-start gap-2 text-sm text-luxor-navy/70 bg-sky-50/60 border border-sky-200 rounded-xl p-3">
                  <MapPin size={15} className="text-sky-600 shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-luxor-navy">عنوان الاستلام:</span> {product.pickup_address}</span>
                </div>
              )}
            </div>
          )}

          {/* المقاسات والألوان المتاحة */}
          <ProductVariants sizes={product.sizes} colors={product.colors} />

          {/* Price reveal + WhatsApp order (client component) */}
          <PriceReveal
            productId={product.id}
            productTitle={product.title}
            price={product.price}
            compareAtPrice={product.compare_at_price}
            storeWhatsapp={product.store.whatsapp}
            storeName={product.store.name}
            isAvailable={product.is_available}
            depositType={product.deposit_type}
            depositValue={product.deposit_value}
            deliveryType={product.delivery_type}
            deliveryDays={product.delivery_days}
            sizes={product.sizes}
            colors={product.colors}
            categoryName={product.category?.name_ar ?? null}
            brand={product.brand}
            fulfillmentOptions={product.fulfillment_options}
            pickupAddress={product.pickup_address}
          />

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
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 relative">
              {product.store.logo_url ? (
                <CroppedImage
                  src={product.store.logo_url}
                  crop={product.store.logo_meta}
                  alt={product.store.name}
                  sizes="56px"
                />
              ) : (
                <span className="text-luxor-navy font-bold text-xl bg-luxor-gold w-full h-full flex items-center justify-center">{product.store.name.charAt(0)}</span>
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
        </div>
      </div>

      {/* ── Real-time reviews & star ratings ── */}
      <Reviews productId={product.id} title="تقييمات المنتج" />
    </div>
  );
}
