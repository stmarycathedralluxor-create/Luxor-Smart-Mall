import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Store as StoreIcon,
  Package,
  BadgeCheck,
  Sparkles,
  Calendar,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getExpiryInfo } from '@/lib/utils';
import ProductCard from '@/components/ProductCard';
import StoreLogoFrame from '@/components/StoreLogoFrame';
import CroppedImage from '@/components/CroppedImage';
import WhatsAppButton from '@/components/WhatsAppButton';
import Reviews from '@/components/Reviews';
import StarRating from '@/components/StarRating';
import { StoreVisitTracker } from '@/components/ViewTrackers';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatJoinDate(iso?: string) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' });
  } catch {
    return null;
  }
}

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
  // Hide stores whose activation period has expired
  if (getExpiryInfo(store.expires_at).expired) notFound();

  const isVerified = store.is_verified === true;

  // Visit tracking now happens client-side via <StoreVisitTracker> —
  // server-side fire-and-forget RPCs were dropped & this page is ISR-cached.
  let visitCount = 0;
  try {
    const { data: vc } = await supabase.rpc('get_store_visits_count', { p_store_id: store.id });
    visitCount = Number(vc) || 0;
  } catch {
    /* migration 0006 not run yet */
  }

  const { data: products } = await supabase
    .from('products')
    .select('*, store:stores(*), category:categories(*)')
    .eq('store_id', store.id)
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  const productCount = products?.length ?? 0;
  const joinDate = formatJoinDate(store.created_at);

  // Rating summary (gracefully degrades if migration 0004 hasn't run yet)
  let avgRating = 0;
  let reviewCount = 0;
  try {
    const { data: rating } = await supabase.rpc('get_store_rating', { p_store_id: store.id });
    if (rating && rating[0]) {
      avgRating = Number(rating[0].avg_rating) || 0;
      reviewCount = Number(rating[0].review_count) || 0;
    }
  } catch {
    /* reviews not installed yet */
  }

  // Unique categories represented in this store
  const categoryMap = new Map<number, { id: number; slug?: string; name_ar: string; name_en: string; icon: string | null; count: number }>();
  (products ?? []).forEach((p: any) => {
    if (p.category) {
      const existing = categoryMap.get(p.category.id);
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(p.category.id, { ...p.category, count: 1 });
      }
    }
  });
  const storeCategories = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="bg-luxor-sandlight/30 min-h-screen">
      <StoreVisitTracker storeId={store.id} />
      {/* ─────────── COVER / HERO ─────────── */}
      <div className="relative">
        <div className="relative aspect-[16/6] md:aspect-[16/5] lg:aspect-[16/4] bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-darkgold overflow-hidden">
          {store.cover_url ? (
            <CroppedImage
              src={store.cover_url}
              crop={store.cover_meta}
              alt={store.name}
              sizes="100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <StoreIcon size={120} className="text-luxor-gold/20" />
            </div>
          )}
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/95 via-luxor-obsidian/30 to-luxor-obsidian/40" />
          {/* Gold accent shimmer at the bottom */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
        </div>

        {/* Breadcrumb on top of cover */}
        <div className="absolute top-4 inset-x-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/stores"
              className="inline-flex items-center gap-1.5 text-white/90 hover:text-luxor-goldlight bg-luxor-obsidian/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:bg-luxor-obsidian/60"
            >
              <ChevronLeft size={14} className="rtl:rotate-180" />
              جميع المتاجر
            </Link>
          </div>
        </div>
      </div>

      {/* ─────────── STORE IDENTITY HEADER ─────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-20 md:-mt-24 z-10">
          {/* Logo floating above the card — golden metal frame + 2px white frame */}
          <div className="flex justify-center md:justify-start md:ps-8">
            <div className="relative">
              {/* Soft golden halo */}
              <div className="absolute -inset-3 bg-gradient-to-br from-luxor-goldlight/40 via-luxor-gold/20 to-transparent rounded-3xl blur-xl" aria-hidden />
              <StoreLogoFrame
                logoUrl={store.logo_url}
                logoCrop={store.logo_meta}
                name={store.name}
                isVerified={isVerified}
                sizeClass="w-28 h-28 md:w-36 md:h-36"
                fallbackTextClass="text-5xl"
                badgeSize={16}
                sizes="(max-width: 768px) 112px, 144px"
                priority
              />
            </div>
          </div>

          {/* Info card */}
          <div className="mt-5 bg-white rounded-3xl shadow-xl border border-luxor-gold/20 overflow-hidden">
            {/* Top section: name + actions */}
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="flex-1 min-w-0 text-center md:text-start">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-luxor-gold/15 text-luxor-darkgold border border-luxor-gold/30 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles size={11} />
                      متجر رسمي
                    </span>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 bg-gold-gradient text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm">
                        <BadgeCheck size={11} strokeWidth={2.5} />
                        موثّق
                      </span>
                    )}
                    {store.city && (
                      <span className="inline-flex items-center gap-1 bg-luxor-obsidian/5 text-luxor-obsidian/80 border border-luxor-obsidian/10 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                        <MapPin size={11} className="text-luxor-gold" />
                        {store.city}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-4xl font-black text-luxor-obsidian leading-tight">
                    {store.name}
                  </h1>
                  {reviewCount > 0 && (
                    <a href="#reviews" className="inline-block mt-2 hover:opacity-80 transition">
                      <StarRating value={avgRating} size={16} showValue count={reviewCount} />
                    </a>
                  )}
                  {store.description && (
                    <p className="text-luxor-obsidian/70 mt-3 leading-relaxed max-w-2xl mx-auto md:mx-0">
                      {store.description}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                  <WhatsAppButton
                    phone={store.whatsapp}
                    message={`مرحباً، أتواصل معكم من الأقصر سمارت مول بخصوص متجركم ${store.name}`}
                    label="تواصل عبر واتساب"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-luxor-gold/30 to-transparent" />

            {/* Stats row */}
            <div className="grid grid-cols-4 divide-x divide-luxor-gold/15 rtl:divide-x-reverse">
              <div className="p-4 md:p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-luxor-darkgold mb-1">
                  <Package size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">منتجات</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-luxor-obsidian">{productCount}</div>
              </div>
              <div className="p-4 md:p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-luxor-darkgold mb-1">
                  <Eye size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">زيارات</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-luxor-obsidian">{visitCount.toLocaleString('ar-EG')}</div>
              </div>
              <div className="p-4 md:p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-luxor-darkgold mb-1">
                  <Sparkles size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">الأقسام</span>
                </div>
                <div className="text-2xl md:text-3xl font-black text-luxor-obsidian">{storeCategories.length}</div>
              </div>
              <div className="p-4 md:p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-luxor-darkgold mb-1">
                  <Calendar size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">منذ</span>
                </div>
                <div className="text-sm md:text-base font-bold text-luxor-obsidian leading-tight pt-1">
                  {joinDate ?? '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── CATEGORY CHIPS ─────────── */}
        {storeCategories.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2 justify-center md:justify-start">
            {storeCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug ?? cat.id}`}
                className="inline-flex items-center gap-1.5 bg-white border border-luxor-gold/30 hover:border-luxor-gold hover:bg-luxor-gold/10 text-luxor-obsidian/80 hover:text-luxor-darkgold px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm hover:shadow"
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.name_ar}</span>
                <span className="bg-luxor-gold/20 text-luxor-darkgold px-1.5 rounded-full text-[10px] font-bold">
                  {cat.count}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ─────────── PRODUCTS ─────────── */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-luxor-darkgold text-xs font-bold uppercase tracking-widest mb-1">
                <Sparkles size={14} />
                <span>منتجات حصرية</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-luxor-obsidian">
                منتجات المتجر
              </h2>
            </div>
            {productCount > 0 && (
              <div className="text-sm text-luxor-obsidian/60 font-semibold pb-2">
                {productCount} منتج متاح
              </div>
            )}
          </div>

          {!products?.length ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-luxor-gold/30 p-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-luxor-gold/10 mb-4">
                <Package className="text-luxor-gold" size={40} />
              </div>
              <h3 className="text-xl font-bold text-luxor-obsidian mb-2">
                لا توجد منتجات بعد
              </h3>
              <p className="text-luxor-obsidian/60 max-w-md mx-auto">
                هذا المتجر لم يضف منتجات حتى الآن. تواصل معه مباشرة عبر واتساب للاستفسار.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>

        {/* Real-time reviews and star ratings */}
        <div className="pb-16">
          <Reviews storeId={store.id} title="تقييمات المتجر" />
        </div>
      </div>
    </div>
  );
}
