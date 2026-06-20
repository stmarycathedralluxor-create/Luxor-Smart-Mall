'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Sparkles,
  Store,
  ShoppingBag,
  MessageCircle,
  BadgeCheck,
  Gift,
  Smartphone,
  TrendingUp,
  BarChart3,
  Users,
  ArrowLeft,
  ChevronDown,
  Quote,
  Globe,
  Eye,
  PackageCheck,
} from 'lucide-react';
import { useLocale } from './LocaleProvider';
import ShareButton from './ShareButton';

type SiteStats = { site_visits: number; store_visits: number; product_views: number };

function formatCount(n: number, locale: 'ar' | 'en'): string {
  return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
}

export default function CampaignContent({
  storeCount = 0,
  productCount = 0,
  siteStats,
}: {
  storeCount?: number;
  productCount?: number;
  siteStats?: SiteStats;
}) {
  const { locale, t } = useLocale();
  const c = t.campaign;
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const features = [
    { icon: Gift, title: c.feat1Title, desc: c.feat1Desc },
    { icon: MessageCircle, title: c.feat2Title, desc: c.feat2Desc },
    { icon: Store, title: c.feat3Title, desc: c.feat3Desc },
    { icon: Smartphone, title: c.feat4Title, desc: c.feat4Desc },
    { icon: TrendingUp, title: c.feat5Title, desc: c.feat5Desc },
    { icon: BarChart3, title: c.feat6Title, desc: c.feat6Desc },
  ];

  const steps = [c.step1, c.step2, c.step3];

  const testimonials = [
    { text: c.testimonial1, name: c.testimonial1Name },
    { text: c.testimonial2, name: c.testimonial2Name },
    { text: c.testimonial3, name: c.testimonial3Name },
  ];

  const faqs = [
    { q: c.faq1Q, a: c.faq1A },
    { q: c.faq2Q, a: c.faq2A },
    { q: c.faq3Q, a: c.faq3A },
    { q: c.faq4Q, a: c.faq4A },
  ];

  const stats = [
    {
      icon: Store,
      value: formatCount(storeCount, locale),
      label: c.statStores,
    },
    {
      icon: PackageCheck,
      value: formatCount(productCount, locale),
      label: c.statProducts,
    },
    {
      icon: Globe,
      value: formatCount(siteStats?.site_visits ?? 0, locale),
      label: c.statVisits,
    },
    {
      icon: Eye,
      value: formatCount(siteStats?.product_views ?? 0, locale),
      label: c.statOrders,
    },
  ];

  return (
    <div className="bg-marble">
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(212,175,55,0.20) 0%, transparent 55%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.6'%3E%3Cpath d='M30 30c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20zm-20 0c0-11.046 8.954-20 20-20v40c-11.046 0-20-8.954-20-20z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-3xl overflow-hidden ring-2 ring-luxor-gold/50 shadow-luxor-lg animate-gold-glow">
              <Image
                src="/logo.png"
                alt="Luxor Smart Mall"
                fill
                sizes="(min-width: 768px) 112px, 96px"
                className="object-cover"
                priority
              />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-luxor-gold/15 backdrop-blur px-4 py-2 rounded-full text-luxor-gold text-sm font-medium mb-6 ring-1 ring-luxor-gold/30 animate-fade-in">
            <Sparkles size={16} />
            {c.badge}
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-snug animate-fade-in">
            {c.heroTitle}
            <span className="block text-gold-gradient mt-3 text-2xl md:text-4xl">
              {c.heroHighlight}
            </span>
          </h1>

          <p className="text-base md:text-xl text-white/80 max-w-2xl mx-auto mb-8 animate-fade-in">
            {c.heroSubtitle}
          </p>

          {/* Trust pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10 animate-fade-in">
            {[c.noFees, c.noCommission, c.whatsappDirect].map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur text-white/90 text-xs md:text-sm px-3 py-1.5 rounded-full ring-1 ring-luxor-gold/30"
              >
                <BadgeCheck size={15} className="text-luxor-gold" />
                {p}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link href="/signup?as=seller" className="btn-primary !text-base">
              <Store size={20} />
              {c.ctaSeller}
            </Link>
            <Link
              href="/stores"
              className="btn-outline !text-base bg-white/10 backdrop-blur !text-white !border-luxor-gold hover:!bg-luxor-gold hover:!text-luxor-obsidian"
            >
              <ShoppingBag size={20} />
              {c.ctaBuyer}
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── STATS STRIP ───────── */}
      <section className="bg-luxor-obsidian border-y border-luxor-gold/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-center text-luxor-gold/90 text-sm md:text-base font-medium mb-8 tracking-wide">
            {c.statsTitle}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className="mx-auto text-luxor-gold mb-2" size={28} />
                <div className="text-2xl md:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-xs md:text-sm text-white/60 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── WHY US ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-3">{c.whyTitle}</h2>
          <p className="text-luxor-navy/60 max-w-2xl mx-auto">{c.whySubtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="card p-6 group hover:-translate-y-1 transition-transform"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor mb-4 group-hover:scale-105 transition-transform">
                <f.icon className="text-luxor-obsidian" size={26} />
              </div>
              <h3 className="font-bold text-lg text-luxor-navy mb-2">{f.title}</h3>
              <p className="text-luxor-navy/70 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── STEPS ───────── */}
      <section className="bg-luxor-sandlight py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-luxor-navy text-center mb-14">
            {c.stepsTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="text-center relative">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center text-luxor-obsidian font-bold text-3xl shadow-luxor">
                  {formatCount(i + 1, locale)}
                </div>
                <p className="text-luxor-navy font-medium px-2">{step}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/signup?as=seller" className="btn-primary !text-base">
              <Store size={20} />
              {c.ctaSeller}
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── SELLERS / BUYERS ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sellers */}
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-gradient-to-br from-luxor-obsidian to-luxor-charcoal ring-1 ring-luxor-gold/30 shadow-luxor-lg">
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                background:
                  'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.5) 0%, transparent 50%)',
              }}
            />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-luxor-gold/15 ring-1 ring-luxor-gold/40 flex items-center justify-center mb-5">
                <Store className="text-luxor-gold" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{c.sellersTitle}</h3>
              <p className="text-white/75 mb-6 leading-relaxed">{c.sellersDesc}</p>
              <Link href="/signup?as=seller" className="btn-primary !text-base">
                <Store size={18} />
                {c.sellersCta}
              </Link>
            </div>
          </div>

          {/* Buyers */}
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 bg-white ring-1 ring-luxor-gold/30 shadow-luxor-lg">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor mb-5">
                <Users className="text-luxor-obsidian" size={28} />
              </div>
              <h3 className="text-2xl font-bold text-luxor-navy mb-3">{c.buyersTitle}</h3>
              <p className="text-luxor-navy/70 mb-6 leading-relaxed">{c.buyersDesc}</p>
              <Link
                href="/stores"
                className="btn-outline !text-base"
              >
                <ShoppingBag size={18} />
                {c.buyersCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="bg-luxor-sandlight py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-luxor-navy text-center mb-14">
            {c.testimonialsTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((tst, i) => (
              <div key={i} className="card p-6 flex flex-col">
                <Quote className="text-luxor-gold mb-4" size={28} />
                <p className="text-luxor-navy/80 leading-relaxed mb-5 flex-1">{tst.text}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-luxor-gold/20">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center text-luxor-obsidian font-bold">
                    {tst.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-luxor-navy">{tst.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-luxor-navy text-center mb-12">
          {c.faqTitle}
        </h2>
        <div className="space-y-4">
          {faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-2xl border border-luxor-gold/30 bg-white overflow-hidden transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start"
                  aria-expanded={open}
                >
                  <span className="font-semibold text-luxor-navy">{f.q}</span>
                  <ChevronDown
                    size={20}
                    className={`text-luxor-gold shrink-0 transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-5 pb-5 text-luxor-navy/70 leading-relaxed animate-fade-in">
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 100%, rgba(212,175,55,0.22) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{c.finalTitle}</h2>
          <p className="text-white/75 max-w-2xl mx-auto mb-10">{c.finalSubtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup?as=seller" className="btn-primary !text-base">
              <Store size={20} />
              {c.finalCta}
            </Link>
            <ShareButton
              path="/campaign"
              title={locale === 'ar' ? 'الأقصر سمارت مول' : 'Luxor Smart Mall'}
              text={c.heroSubtitle}
              label={c.shareLabel}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-luxor-gold bg-white/10 backdrop-blur text-white font-bold px-6 py-3 hover:bg-luxor-gold hover:text-luxor-obsidian transition !text-base"
            />
          </div>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-luxor-gold/80 hover:text-luxor-gold text-sm"
            >
              {t.nav.home}
              <ArrowLeft size={15} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
