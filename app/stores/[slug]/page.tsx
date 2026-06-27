import type { Metadata } from 'next';
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
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getExpiryInfo, absoluteUrl } from '@/lib/utils';
import { resolveCatalogProducts } from '@/lib/catalogs';
import type { Catalog } from '@/lib/types';
import ProductsLazyGrid from '@/components/ProductsLazyGrid';
import StoreLogoFrame from '@/components/StoreLogoFrame';
import CroppedImage from '@/components/CroppedImage';
import WhatsAppButton from '@/components/WhatsAppButton';
import ShareButton from '@/components/ShareButton';
import Reviews from '@/components/Reviews';
import StarRating from '@/components/StarRating';
import { StoreVisitTracker } from '@/components/ViewTrackers';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** OG/Twitter metadata so sharing a store shows its profile image + name. */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: store } = await supabase
    .from('stores')
    .select('name, description, logo_url, cover_url')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!store) {
    return { title: 'متجر غير موجود | الأقصر سمارت مول' };
  }

  const title = `${store.name} | الأقصر سمارت مول`;
  const description =
    store.description?.slice(0, 160) || `تسوّق من متجر ${store.name} على الأقصر سمارت مول`;
  // Prefer the store profile (logo); fall back to the cover.
  const image = store.logo_url || store.cover_url;
  const url = absoluteUrl(`/stores/${params.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: image ? [{ url: image, alt: store.name }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

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

  // كتالوجات هذا المتجر — تظهر فوراً بدون موافقة (scope='store' أو عامة معتمدة)
  // نعتمد على resolveCatalogProducts لاحقاً للعرض، وهنا نجلب أغلفة مبسّطة فقط
  let storeCatalogs: Array<{
    catalog: Catalog;
    cover: string | null;
    count: number;
  }> = [];
  try {
    const { data: catalogsRaw } = await supabase
      .from('catalogs')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    const cats = ((catalogsRaw ?? []) as Catalog[]).filter(
      (c) => c.scope === 'store' || c.is_approved
    );
    const resolved = await Promise.all(
      cats.map(async (c) => {
        const prods = await resolveCatalogProducts(supabase, c);
        return {
          catalog: c,
          cover: c.cover_image || prods[0]?.images?.[0] || null,
          count: prods.length,
        };
      })
    );
    // أخفِ الكتالوجات الفارغة (لا منتجات متاحة)
    storeCatalogs = resolved.filter((r) => r.count > 0);
  } catch {
    /* جدول الكتالوجات غير مثبَّت بعد (migration 0013) */
  }

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
                  <ShareButton
                    path={`/stores/${store.slug}`}
                    title={store.name}
                    text={`تسوّق من متجر ${store.name} على الأقصر سمارت مول`}
                    label="مشاركة المتجر"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-luxor-gold/50 bg-white text-luxor-darkgold font-bold px-4 py-2.5 hover:bg-luxor-gold/10 transition shadow-sm w-full md:w-auto justify-center"
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

        {/* ─────────── STORE CATALOGS (المجلات) ─────────── */}
        {storeCatalogs.length > 0 && (
          <div className="mt-12">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-luxor-darkgold text-xs font-bold uppercase tracking-widest mb-1">
                  <BookOpen size={14} />
                  <span>اقلب الصفحات</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-luxor-obsidian">كتالوجات المتجر</h2>
              </div>
              <div className="text-sm text-luxor-obsidian/60 font-semibold pb-2">
                {storeCatalogs.length} كتالوج
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {storeCatalogs.map(({ catalog: c, cover, count }) => (
                <div key={c.id} className="group relative">
                  <Link href={`/catalog/${c.slug}`} className="block">
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-luxor-gold/20 shadow-lg group-hover:shadow-xl group-hover:border-luxor-gold/50 transition-all bg-gradient-to-br from-luxor-navy to-luxor-obsidian">
                      {cover && (
                        <CroppedImage
                          src={cover}
                          crop={c.cover_meta ?? null}
                          alt={c.title}
                          imgClassName="object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      )}
                      {/* تأثير حافة المجلة */}
                      <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/30 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <div className="flex items-center gap-1.5 text-luxor-gold text-[10px] font-bold uppercase tracking-widest mb-1">
                          <BookOpen size={11} /> كتالوج
                        </div>
                        <h3 className="text-white font-black text-base leading-tight line-clamp-2">{c.title}</h3>
                        <p className="text-white/70 text-[11px] mt-1">{count} منتج</p>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute top-2 left-2 z-10">
                    <ShareButton
                      path={`/catalog/${c.slug}`}
                      title={`${c.title} — ${store.name}`}
                      text={`تصفّح كتالوج "${c.title}" من ${store.name} على الأقصر سمارت مول`}
                      variant="icon"
                      className="!bg-white/90 hover:!bg-white shadow"
                    />
                  </div>
                </div>
              ))}
            </div>
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
            <div className="flex items-center gap-3 pb-2">
              {productCount > 0 && (
                <Link
                  href={`/catalog/browse?store=${store.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-luxor-darkgold border border-luxor-gold/40 hover:bg-luxor-gold/10 rounded-full px-3 py-1.5 transition"
                >
                  <Sparkles size={13} /> تصفّح كل المنتجات
                </Link>
              )}
              {productCount > 0 && (
                <div className="text-sm text-luxor-obsidian/60 font-semibold">
                  {productCount} منتج متاح
                </div>
              )}
            </div>
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
            <ProductsLazyGrid products={products as any} />
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
