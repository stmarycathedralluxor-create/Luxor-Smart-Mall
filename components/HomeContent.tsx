'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShoppingBag, Store, Sparkles, Globe, Eye, BookOpen } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import CategoriesCarousel from './CategoriesCarousel';
import StoresCarousel from './StoresCarousel';
import ProductsCarousel from './ProductsCarousel';
import CatalogsCarousel, { type HomeCatalogCard } from './CatalogsCarousel';
import ShareButton from './ShareButton';
import type { ProductWithStore, Store as StoreType, Category } from '@/lib/types';

type SiteStats = { site_visits: number; store_visits: number; product_views: number };

function formatCount(n: number, locale: 'ar' | 'en'): string {
  return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

export default function HomeContent({
  products,
  stores,
  categories,
  catalogs = [],
  siteStats,
}: {
  products: ProductWithStore[];
  stores: StoreType[];
  categories: Category[];
  catalogs?: HomeCatalogCard[];
  siteStats?: SiteStats;
}) {
  const { locale, t } = useLocale();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Deep obsidian gradient (matches new LSM logo) */}
        <div className="absolute inset-0 bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian" />
        {/* Gold radial glow */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.18) 0%, transparent 55%)',
        }} />
        {/* Subtle hieroglyphic pattern */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.6'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20zm-20 0c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            {/* Hero logo badge */}
            <div className="flex justify-center mb-8 animate-fade-in">
              <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl overflow-hidden ring-2 ring-luxor-gold/50 shadow-luxor-lg animate-gold-glow">
                <Image
                  src="/logo.png"
                  alt="Luxor Smart Mall"
                  fill
                  sizes="(min-width: 768px) 128px, 112px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-luxor-gold/15 backdrop-blur px-4 py-2 rounded-full text-luxor-gold text-sm font-medium mb-6 ring-1 ring-luxor-gold/30 animate-fade-in">
              <Sparkles size={16} />
              {locale === 'ar' ? '🏛️ سوق الأقصر الذكي' : '🏛️ The Smart Luxor Marketplace'}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
              {t.home.heroTitle}
              <span className="block text-gold-gradient mt-2 text-3xl md:text-5xl">
                {locale === 'ar' ? 'تسوّق بذكاء' : 'Shop Smarter'}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10 animate-fade-in">
              {t.home.heroSubtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
              <Link href="/stores" className="btn-primary !text-base">
                <ShoppingBag size={20} />
                {t.home.browseStores}
              </Link>
              <Link href="/signup?as=seller" className="btn-outline !text-base bg-white/10 backdrop-blur !text-white !border-luxor-gold hover:!bg-luxor-gold hover:!text-luxor-obsidian">
                <Store size={20} />
                {t.home.openStore}
              </Link>
              <ShareButton
                path="/"
                title={locale === 'ar' ? 'الأقصر سمارت مول' : 'Luxor Smart Mall'}
                text={
                  locale === 'ar'
                    ? 'تسوّق من متاجر الأقصر على الأقصر سمارت مول'
                    : 'Shop Luxor stores on Luxor Smart Mall'
                }
                label={locale === 'ar' ? 'شارك الموقع' : 'Share'}
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-luxor-gold bg-white/10 backdrop-blur text-white font-bold px-5 py-3 hover:bg-luxor-gold hover:text-luxor-obsidian transition !text-base"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
              {[
                {
                  icon: Globe,
                  value: formatCount(siteStats?.site_visits ?? 0, locale),
                  label: locale === 'ar' ? 'زيارة للموقع' : 'Site Visits',
                },
                {
                  icon: Store,
                  value: formatCount(siteStats?.store_visits ?? 0, locale),
                  label: locale === 'ar' ? 'زيارة للمتاجر' : 'Store Visits',
                },
                {
                  icon: Eye,
                  value: formatCount(siteStats?.product_views ?? 0, locale),
                  label: locale === 'ar' ? 'مشاهدة للمنتجات' : 'Product Views',
                },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <s.icon className="mx-auto text-luxor-gold mb-2" size={28} />
                  <div className="text-2xl md:text-3xl font-bold text-white">{s.value}</div>
                  <div className="text-xs md:text-sm text-white/60">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES — قطار أفقي بالصور المختارة */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.categories}</h2>
            <Link href="/categories" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
              {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <CategoriesCarousel categories={categories} />
        </section>
      )}

      {/* FEATURED STORES */}
      {stores.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.featuredStores}</h2>
            <Link href="/stores" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
              {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <StoresCarousel stores={stores} />
        </section>
      )}

      {/* LATEST PRODUCTS — قطار أفقي */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.latestProducts}</h2>
            <Link href="/search" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
              {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <ProductsCarousel products={products} />
        </section>
      )}

      {/* CATALOGS — كاروسيل ملء الشاشة بنمط الأفلام (Coverflow) */}
      {catalogs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy flex items-center gap-2">
              <BookOpen size={26} className="text-luxor-gold" />
              {t.home.catalogs}
            </h2>
            <Link href="/catalog" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
              {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <CatalogsCarousel catalogs={catalogs} />
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="bg-luxor-sandlight py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-luxor-navy text-center mb-12">
            {t.home.howItWorks}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: '1', title: t.home.step1Title, desc: t.home.step1Desc },
              { num: '2', title: t.home.step2Title, desc: t.home.step2Desc },
              { num: '3', title: t.home.step3Title, desc: t.home.step3Desc },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center text-luxor-navy font-bold text-3xl shadow-luxor">
                  {step.num}
                </div>
                <h3 className="font-bold text-xl text-luxor-navy mb-2">{step.title}</h3>
                <p className="text-luxor-navy/70">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href="/signup?as=seller" className="btn-primary !text-base">
              <Store size={20} />
              {t.home.openStore}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
