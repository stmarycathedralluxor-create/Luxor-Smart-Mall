'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft, ChevronRight, Store as StoreIcon, Tag, Zap, CalendarClock,
  Eye, Maximize2, Minimize2, X,
} from 'lucide-react';
import { discountPercent, deliveryDaysLabel, formatPrice } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — كاروسيل عصري وأنيق لعرض منتجات الكتالوج.
 *
 * - شريحة لكل منتج تنزلق بسلاسة، مع لمحة من الشرائح المجاورة (peek).
 * - الصور تُعرض بـ object-contain على خلفية متدرّجة فلا تُشدّ ولا تُشوَّه
 *   مهما كانت نسبة أبعادها الأصلية.
 * - أسهم RTL صحيحة: اليمين (►) = السابق، اليسار (◄) = التالي.
 * - ملء الشاشة عبر React Portal إلى document.body فيغطّي الشاشة بالكامل.
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
  void coverImage;
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const total = products.length;
  const maxIndex = Math.max(0, total - 1);

  useEffect(() => setMounted(true), []);

  const goNext = useCallback(() => setCurrent((c) => Math.min(maxIndex, c + 1)), [maxIndex]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const goTo = useCallback((i: number) => setCurrent(() => Math.max(0, Math.min(maxIndex, i))), [maxIndex]);

  // أسهم الكيبورد — RTL: الأيسر = التالي، الأيمن = السابق
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
      if (dx > 0) goPrev(); // RTL: سحب لليمين = السابق
      else goNext();
    }
    touchStartX.current = null;
  };

  const progress = total ? Math.round(((current + 1) / total) * 100) : 0;

  const carousel = (
    <div className={`flex flex-col ${fullscreen ? 'h-full' : ''}`}>
      {/* شريط أدوات */}
      <div className={`flex items-center justify-between gap-3 mb-4 ${fullscreen ? 'text-white px-1' : ''}`}>
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
        className="relative flex-1 flex items-center justify-center min-h-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <NavArrow dir="prev" onClick={goPrev} disabled={current <= 0} fullscreen={fullscreen} />

        <div className={`w-full mx-auto overflow-hidden ${fullscreen ? 'max-w-2xl' : 'max-w-lg'}`}>
          {/*
            الحاوية RTL → عناصر flex العادية تبدأ من اليمين. translateX موجب
            يحرّك المسار يميناً فتظهر الشرائح التالية (يساراً).
          */}
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(${current * 100}%)` }}
          >
            {products.map((product, index) => (
              <div key={product.id} className="w-full shrink-0 px-1 sm:px-2">
                <ProductSlide
                  product={product}
                  index={index}
                  active={index === current}
                  fullscreen={fullscreen}
                />
              </div>
            ))}
          </div>
        </div>

        <NavArrow dir="next" onClick={goNext} disabled={current >= maxIndex} fullscreen={fullscreen} />
      </div>

      {/* نقاط الترقيم */}
      {total > 1 && (
        <div className="mt-5 flex items-center justify-center gap-1.5 flex-wrap max-w-full px-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`المنتج ${i + 1}`}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? 'w-7 h-2 bg-gold-gradient'
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
          <div className="h-full bg-gold-gradient transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );

  if (fullscreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-luxor-obsidian/97 backdrop-blur-md flex flex-col p-3 md:p-6">
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
  // RTL: السابق على اليمين (►)، التالي على اليسار (◄)
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
  active,
  fullscreen,
}: {
  product: ProductWithStore;
  index: number;
  active: boolean;
  fullscreen: boolean;
}) {
  const img = product.images?.[0];
  const pct = discountPercent(product.price, product.compare_at_price);
  const isPreorder = product.delivery_type === 'preorder';

  return (
    <Link
      href={`/products/${product.id}`}
      className={`group block w-full overflow-hidden rounded-3xl border bg-white transition-all duration-500 ${
        active
          ? 'border-luxor-gold/40 shadow-luxor-lg scale-100 opacity-100'
          : 'border-luxor-gold/15 shadow-sm scale-[0.94] opacity-60'
      }`}
    >
      {/*
        الصورة: object-contain على خلفية متدرّجة داكنة ناعمة، فلا تُشدّ
        الصورة ولا تُقَص — تظهر كاملةً بنسبتها الصحيحة.
      */}
      <div
        className={`relative w-full overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian ${
          fullscreen ? 'aspect-[16/11]' : 'aspect-[4/3]'
        }`}
      >
        {/* خلفية ضبابية تملأ الفراغ بأناقة */}
        {img && (
          <Image
            src={img}
            alt=""
            fill
            sizes="700px"
            aria-hidden
            className="object-cover scale-110 blur-2xl opacity-30"
          />
        )}
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width:768px) 100vw, 700px"
            className="object-contain p-2 group-hover:scale-[1.03] transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={56} />
          </div>
        )}

        {/* الشارات */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 items-start">
          {pct !== null && (
            <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow" dir="ltr">
              -{pct}%
            </span>
          )}
          {product.category && (
            <span className="bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow">
              {product.category.icon} {product.category.name_ar}
            </span>
          )}
        </div>
        <span className="absolute top-3 end-3 bg-luxor-obsidian/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur" dir="ltr">
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

        {/* السعر */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xl md:text-2xl font-black text-luxor-darkgold">
            {formatPrice(product.price)}
          </span>
          {pct !== null && product.compare_at_price && (
            <span className="text-sm text-luxor-navy/40 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

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
