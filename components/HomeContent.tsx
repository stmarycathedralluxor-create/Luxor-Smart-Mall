'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Store, Users, Sparkles } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import ProductCard from './ProductCard';
import StoreCard from './StoreCard';
import type { ProductWithStore, Store as StoreType, Category } from '@/lib/types';

export default function HomeContent({
  products,
  stores,
  categories,
}: {
  products: ProductWithStore[];
  stores: StoreType[];
  categories: Category[];
}) {
  const { locale, t } = useLocale();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-luxor-navy via-luxor-navy to-[#1a3a5c]" />
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.4'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20zm-20 0c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-luxor-gold/20 backdrop-blur px-4 py-2 rounded-full text-luxor-gold text-sm font-medium mb-6 animate-fade-in">
              <Sparkles size={16} />
              {locale === 'ar' ? '🏛️ سوق الأقصر الذكي' : '🏛️ The Smart Luxor Marketplace'}
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 animate-fade-in">
              {t.home.heroTitle}
              <span className="block text-luxor-gold mt-2 text-3xl md:text-5xl">
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
              <Link href="/signup" className="btn-outline !text-base bg-white/10 backdrop-blur !text-white !border-luxor-gold hover:!bg-luxor-gold hover:!text-luxor-navy">
                <Store size={20} />
                {t.home.openStore}
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-16 max-w-2xl mx-auto">
              {[
                { icon: Store, value: stores.length + '+', label: t.nav.stores },
                { icon: ShoppingBag, value: products.length + '+', label: locale === 'ar' ? 'منتج' : 'Products' },
                { icon: Users, value: '∞', label: locale === 'ar' ? 'عميل سعيد' : 'Happy Customers' },
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

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.categories}</h2>
          <Link href="/categories" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
            {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className="card p-6 text-center hover:border-luxor-gold hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="font-semibold text-luxor-navy text-sm">
                {locale === 'ar' ? cat.name_ar : cat.name_en}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED STORES */}
      {stores.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.featuredStores}</h2>
            <Link href="/stores" className="text-luxor-gold hover:text-luxor-darkgold font-medium flex items-center gap-1">
              {t.common.all} <ArrowLeft size={16} className="rtl:rotate-180" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      )}

      {/* LATEST PRODUCTS */}
      {products.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-luxor-navy">{t.home.latestProducts}</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
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
            <Link href="/signup" className="btn-primary !text-base">
              <Store size={20} />
              {t.home.openStore}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
