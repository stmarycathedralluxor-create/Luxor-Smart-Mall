'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Store as StoreIcon, Tag, Zap, CalendarClock,
  Eye, Maximize2, Minimize2, X,
} from 'lucide-react';
import CroppedImage from '@/components/CroppedImage';
import { discountPercent, deliveryDaysLabel } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — كاروسيل عصري وأنيق لعرض منتجات الكتالوج.
 *
 * - شريحة لكل منتج تنزلق بسلاسة (slide transition) بدل قلب صفحات المجلة.
 * - أسهم تنقّل مهيّأة لاتجاه RTL بشكل صحيح:
 *     • السهم على اليسار (chevron يشير لليسار) = التالي
 *     • السهم على اليمين (chevron يشير لليمين) = السابق
 * - وضع ملء الشاشة عبر React Portal إلى document.body فيغطّي الشاشة بالكامل
 *   ولا يبقى محصوراً داخل صندوق الصفحة.
 * - نقاط ترقيم (dots) + شريط تقدّم + لمس/سحب + أسهم الكيبورد.
 */

export default function MagazineFlipbook({
  title,
  products,
  storeName,
  coverImage,
}: {
  title: string;
  products: ProductWithStore[];
  storeName?: string | null;
  coverImage?: string | null;
}) {
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = products.length;
  const maxIndex = Math.max(0, total - 1);

  useEffect(() => setMounted(true), []);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(maxIndex, c + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const goTo = useCallback((i: number) => {
    setCurrent(() => Math.max(0, Math.min(maxIndex, i)));
  }, [maxIndex]);

  // أسهم الكيبورد — في RTL: السهم الأيسر = التالي، الأيمن = السابق
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goNext();
      else if (e.key === 'ArrowRight') goPrev();
      else if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, fullscreen]);

  // منع تمرير الصفحة خلف وضع ملء الشاشة
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      // RTL: السحب لليمين = السابق، لليسار = التالي
      if (dx > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  };

  const progress = total ? Math.round(((current + 1) / total) * 100) : 0;

  // ---------- محتوى الكاروسيل (مشترك بين الوضع العادي وملء الشاشة) ----------
  const carousel = (
    <div className={`flex flex-col ${fullscreen ? 'h-full' : ''}`}>
      {/* شريط أدوات */}
      <div className={`flex items-center justify-between gap-3 mb-3 ${fullscreen ? 'text-white px-1' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={18} className={fullscreen ? 'text-luxor-goldlight' : 'text-luxor-darkgold'} />
          <span className="font-bold truncate">{title}</span>
          {storeName && (
            <span className={`hidden sm:inline text-xs ${fullscreen ? 'text-white/60' : 'text-luxor-navy/50'}`}>
              · {storeName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 transition ${
            fullscreen
              ? 'border-luxor-gold/50 text-white hover:bg-white/10'
              : 'border-luxor-gold/40 text-luxor-darkgold hover:bg-luxor-gold/10'
          }`}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {fullscreen ? 'تصغير' : 'ملء الشاشة'}
        </button>
      </div>

      {/* مسار الكاروسيل */}
      <div
        className="relative flex-1 flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* السهم على اليمين في RTL = السابق */}
        <NavArrow dir="prev" onClick={goPrev} disabled={current <= 0} fullscreen={fullscreen} />

        {/* الإطار الذي يعرض شريحة واحدة وينزلق */}
        <div className={`w-full ${fullscreen ? 'max-w-3xl' : 'max-w-xl'} mx-auto overflow-hidden`}>
          {/*
            الحاوية RTL، لذا عناصر الـflex العادية تُرتَّب من اليمين لليسار
            وتبدأ الشريحة 0 على أقصى اليمين. لإظهار الشريحة الحالية ننزلق
            المسار: translateX موجب يحرّك المحتوى لليمين فتظهر الشرائح التالية
            (الموجودة يساراً). نستخدم نسبة موجبة تساوي رقم الشريحة الحالية.
          */}
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${current * 100}%)` }}
          >
            {products.map((product, index) => (
              <div key={product.id} className="w-full shrink-0 px-1.5 md:px-3">
                <ProductSlide product={product} index={index} fullscreen={fullscreen} />
              </div>
            ))}
          </div>
        </div>

        {/* السهم على اليسار في RTL = التالي */}
        <NavArrow dir="next" onClick={goNext} disabled={current >= maxIndex} fullscreen={fullscreen} />
      </div>

      {/* نقاط الترقيم */}
      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap max-w-full px-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`المنتج ${i + 1}`}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-6 h-2 bg-gold-gradient'
                  : `w-2 h-2 ${fullscreen ? 'bg-white/30 hover:bg-white/60' : 'bg-luxor-gold/30 hover:bg-luxor-gold/60'}`
              }`}
            />
          ))}
        </div>
      )}

      {/* شريط التقدّم + الترقيم */}
      <div className={`mt-3 flex items-center gap-3 ${fullscreen ? 'text-white/80 px-1' : 'text-luxor-navy/60'}`}>
        <span className="text-xs font-bold whitespace-nowrap" dir="ltr">
          {current + 1} / {total}
        </span>
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${fullscreen ? 'bg-white/15' : 'bg-luxor-gold/15'}`}>
          <div
            className="h-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  // ---------- وضع ملء الشاشة عبر Portal ----------
  if (fullscreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-luxor-obsidian/97 backdrop-blur-sm flex flex-col p-3 md:p-6">
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          aria-label="إغلاق ملء الشاشة"
          className="absolute top-3 end-3 z-[110] inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition"
        >
          <X size={18} />
        </button>
        <div className="flex-1 min-h-0">{carousel}</div>
      </div>,
      document.body,
    );
  }

  return <div className="relative">{carousel}</div>;
}

function NavArrow({
  dir,
  onClick,
  disabled,
  fullscreen,
}: {
  dir: 'next' | 'prev';
  onClick: () => void;
  disabled: boolean;
  fullscreen: boolean;
}) {
  // في RTL: السابق على اليمين (chevron يشير لليمين)، التالي على اليسار (chevron يشير لليسار)
  const pos = dir === 'prev' ? 'end-0 md:-end-5' : 'start-0 md:-start-5';
  const Icon = dir === 'prev' ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'السابق' : 'التالي'}
      className={`absolute ${pos} top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg border transition disabled:opacity-25 disabled:cursor-not-allowed ${
        fullscreen
          ? 'bg-white/10 border-white/30 text-white hover:bg-luxor-gold hover:text-luxor-obsidian'
          : 'bg-white border-luxor-gold/30 text-luxor-darkgold hover:bg-luxor-gold hover:text-luxor-obsidian'
      }`}
    >
      <Icon size={22} />
    </button>
  );
}

function ProductSlide({
  product,
  index,
  fullscreen,
}: {
  product: ProductWithStore;
  index: number;
  fullscreen: boolean;
}) {
  const img = product.images?.[0];
  const crop = product.images_meta?.[0] ?? null;
  const pct = discountPercent(product.price, product.compare_at_price);
  const isPreorder = product.delivery_type === 'preorder';

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block w-full overflow-hidden rounded-3xl border border-luxor-gold/25 bg-white shadow-luxor-lg"
    >
      {/* الصورة */}
      <div className={`relative ${fullscreen ? 'aspect-[4/3] md:aspect-[16/10]' : 'aspect-[4/3]'} overflow-hidden bg-luxor-obsidian`}>
        {img ? (
          <span className="absolute inset-0 block group-hover:scale-105 transition-transform duration-700">
            <CroppedImage src={img} crop={crop} alt={product.title} sizes="(max-width:768px) 100vw, 768px" />
          </span>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={56} />
          </div>
        )}
        <div className="absolute top-2.5 start-2.5 flex flex-col gap-1.5 items-start">
          {pct !== null && (
            <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow" dir="ltr">
              -{pct}%
            </span>
          )}
          {product.category && (
            <span className="bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              {product.category.icon} {product.category.name_ar}
            </span>
          )}
        </div>
        <span className="absolute bottom-2.5 end-2.5 bg-luxor-obsidian/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" dir="ltr">
          {index + 1}
        </span>
      </div>

      {/* التفاصيل */}
      <div className="p-4 md:p-5 flex flex-col">
        {product.brand && (
          <span className="inline-block self-start bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 uppercase">
            {product.brand}
          </span>
        )}
        <h3 className="font-black text-luxor-obsidian leading-tight text-lg md:text-xl line-clamp-2 group-hover:text-luxor-darkgold transition">
          {product.title}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-luxor-navy/55 text-[11px] md:text-xs flex-wrap">
          {product.store && (
            <span className="inline-flex items-center gap-1">
              <StoreIcon size={12} className="text-luxor-darkgold" /> {product.store.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {isPreorder ? <CalendarClock size={12} /> : <Zap size={12} />}
            {isPreorder
              ? product.delivery_days
                ? deliveryDaysLabel(product.delivery_days, 'ar')
                : 'حجز مسبق'
              : 'متاح فوراً'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {product.views ?? 0}
          </span>
        </div>
        <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-sm font-bold text-luxor-goldlight bg-luxor-obsidian border border-luxor-gold/50 px-3 py-2.5 rounded-xl group-hover:bg-gold-gradient group-hover:text-luxor-obsidian transition">
          <Tag size={14} /> افتح صفحة المنتج
        </span>
      </div>
    </Link>
  );
}
