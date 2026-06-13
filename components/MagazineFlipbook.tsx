'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Store as StoreIcon, Tag, Zap, CalendarClock,
  Eye, BookOpen, Maximize2, Minimize2,
} from 'lucide-react';
import CroppedImage from '@/components/CroppedImage';
import { discountPercent, deliveryDaysLabel } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — كتالوج تفاعلي على هيئة مجلة حقيقية تُقلَّب صفحاتها.
 *
 * - غلاف (صفحة 0) ثم صفحة لكل منتج، وصفحة خلفية في النهاية.
 * - على الشاشات الكبيرة يظهر "سبريد" من صفحتين كالمجلة المفتوحة؛
 *   وعلى الجوال صفحة واحدة.
 * - قلب الصفحات بانيميشن ثلاثي الأبعاد (CSS transform/perspective).
 * - الضغط على المنتج يفتح صفحته. أسهم/سحب/لمس للتنقّل.
 */

type Page =
  | { kind: 'cover' }
  | { kind: 'product'; product: ProductWithStore; index: number }
  | { kind: 'back' };

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
  const pages: Page[] = useMemo(() => {
    const p: Page[] = [{ kind: 'cover' }];
    products.forEach((product, index) => p.push({ kind: 'product', product, index }));
    p.push({ kind: 'back' });
    return p;
  }, [products]);

  const [current, setCurrent] = useState(0);
  const [flipping, setFlipping] = useState<null | 'next' | 'prev'>(null);
  const [isWide, setIsWide] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // عرض صفحتين على الشاشات الكبيرة
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const step = isWide ? 2 : 1;
  const maxIndex = pages.length - 1;

  const goNext = useCallback(() => {
    setCurrent((c) => {
      if (c >= maxIndex) return c;
      setFlipping('next');
      return c;
    });
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setCurrent((c) => {
      if (c <= 0) return c;
      setFlipping('prev');
      return c;
    });
  }, []);

  // بعد انتهاء الانيميشن نحدّث الصفحة الحالية فعلياً
  useEffect(() => {
    if (!flipping) return;
    const t = setTimeout(() => {
      setCurrent((c) => {
        if (flipping === 'next') return Math.min(maxIndex, c + step);
        return Math.max(0, c - step);
      });
      setFlipping(null);
    }, 520);
    return () => clearTimeout(t);
  }, [flipping, step, maxIndex]);

  // أسهم الكيبورد
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // في RTL: السهم الأيسر = التالي، الأيمن = السابق
      if (e.key === 'ArrowLeft') goNext();
      else if (e.key === 'ArrowRight') goPrev();
      else if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, fullscreen]);

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

  const progress = Math.round(((current + 1) / pages.length) * 100);

  const leftPageIdx = current; // في RTL الصفحة "الأولى" تظهر على اليمين
  const rightPageIdx = current + 1;

  return (
    <div
      ref={containerRef}
      className={`relative ${
        fullscreen ? 'fixed inset-0 z-[60] bg-luxor-obsidian/95 backdrop-blur-sm flex flex-col p-3 md:p-6' : ''
      }`}
    >
      {/* شريط أدوات */}
      <div className={`flex items-center justify-between gap-3 mb-3 ${fullscreen ? 'text-white' : ''}`}>
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={18} className={fullscreen ? 'text-luxor-goldlight' : 'text-luxor-darkgold'} />
          <span className="font-bold truncate">{title}</span>
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

      {/* المجلة */}
      <div
        className="relative flex-1 flex items-center justify-center"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* سهم السابق (يمين في RTL) */}
        <NavArrow side="prev" onClick={goPrev} disabled={current <= 0} />

        <div
          className="book-perspective w-full max-w-5xl"
          style={{ perspective: '2200px' }}
        >
          <div className={`flex ${isWide ? 'gap-0' : ''} justify-center`}>
            {/* الصفحة اليمنى (الأولى في RTL) */}
            <BookPage
              page={pages[leftPageIdx]}
              title={title}
              storeName={storeName}
              coverImage={coverImage}
              flipping={flipping}
              side="right"
              isWide={isWide}
              total={products.length}
            />
            {/* الصفحة اليسرى (الثانية) — فقط على الشاشات الكبيرة */}
            {isWide && rightPageIdx <= maxIndex && (
              <BookPage
                page={pages[rightPageIdx]}
                title={title}
                storeName={storeName}
                coverImage={coverImage}
                flipping={flipping}
                side="left"
                isWide={isWide}
                total={products.length}
              />
            )}
          </div>
        </div>

        {/* سهم التالي (يسار في RTL) */}
        <NavArrow side="next" onClick={goNext} disabled={current >= maxIndex} />
      </div>

      {/* شريط التقدّم + ترقيم */}
      <div className={`mt-4 flex items-center gap-3 ${fullscreen ? 'text-white/80' : 'text-luxor-navy/60'}`}>
        <span className="text-xs font-bold whitespace-nowrap" dir="ltr">
          {Math.min(current + 1, pages.length)} / {pages.length}
        </span>
        <div className="flex-1 h-1.5 rounded-full bg-luxor-gold/15 overflow-hidden">
          <div
            className="h-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function NavArrow({
  side,
  onClick,
  disabled,
}: {
  side: 'next' | 'prev';
  onClick: () => void;
  disabled: boolean;
}) {
  // في RTL: prev على اليمين، next على اليسار
  const pos = side === 'prev' ? 'end-0 md:-end-4' : 'start-0 md:-start-4';
  const Icon = side === 'prev' ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'prev' ? 'السابق' : 'التالي'}
      className={`absolute ${pos} top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg border border-luxor-gold/30 text-luxor-darkgold hover:bg-luxor-gold hover:text-luxor-obsidian transition disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      <Icon size={22} />
    </button>
  );
}

function BookPage({
  page,
  title,
  storeName,
  coverImage,
  flipping,
  side,
  isWide,
  total,
}: {
  page: Page | undefined;
  title: string;
  storeName?: string | null;
  coverImage?: string | null;
  flipping: null | 'next' | 'prev';
  side: 'left' | 'right';
  isWide: boolean;
  total: number;
}) {
  if (!page) {
    return (
      <div className="relative aspect-[3/4] w-full md:w-1/2 bg-luxor-sandlight/40 rounded-2xl" />
    );
  }

  // انيميشن القلب — نطبّقه على الصفحة المعنية حسب الاتجاه
  const flipClass =
    flipping === 'next' && side === 'right'
      ? 'animate-page-flip-next'
      : flipping === 'prev' && side === 'left'
        ? 'animate-page-flip-prev'
        : '';

  const roundSide = isWide
    ? side === 'right'
      ? 'rounded-s-2xl' // اليمين في RTL
      : 'rounded-e-2xl'
    : 'rounded-2xl';

  return (
    <div
      className={`relative aspect-[3/4] w-full ${isWide ? 'md:w-1/2 md:max-w-md' : 'max-w-md mx-auto'} ${flipClass}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        className={`absolute inset-0 overflow-hidden border border-luxor-gold/30 shadow-luxor-lg bg-white ${roundSide}`}
      >
        {page.kind === 'cover' && (
          <CoverPage title={title} storeName={storeName} coverImage={coverImage} total={total} />
        )}
        {page.kind === 'product' && <ProductPage page={page} />}
        {page.kind === 'back' && <BackPage total={total} />}
      </div>
      {/* ظل تجليد الكتاب في المنتصف */}
      {isWide && (
        <div
          className={`absolute top-0 bottom-0 w-8 pointer-events-none ${
            side === 'right' ? 'start-0 bg-gradient-to-r' : 'end-0 bg-gradient-to-l'
          } from-black/20 to-transparent`}
        />
      )}
    </div>
  );
}

function CoverPage({
  title,
  storeName,
  coverImage,
  total,
}: {
  title: string;
  storeName?: string | null;
  coverImage?: string | null;
  total: number;
}) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian text-white flex flex-col">
      {coverImage && (
        <span className="absolute inset-0 block opacity-40">
          <CroppedImage src={coverImage} crop={null} alt={title} sizes="480px" />
        </span>
      )}
      <div className="absolute inset-0 pattern-egyptian opacity-20" aria-hidden />
      <div className="relative flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="inline-flex items-center gap-2 bg-luxor-gold/15 border border-luxor-gold/40 text-luxor-goldlight px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-5">
          <BookOpen size={12} /> كتالوج
        </div>
        <h2 className="text-3xl md:text-4xl font-black leading-tight text-gold-gradient">{title}</h2>
        {storeName && <p className="mt-3 text-white/70 text-sm">{storeName}</p>}
        <div className="mt-6 bg-white/10 backdrop-blur border border-luxor-gold/30 rounded-2xl px-5 py-2.5">
          <span className="text-2xl font-black text-luxor-goldlight">{total}</span>
          <span className="text-[11px] text-white/60 block uppercase tracking-wider">منتج</span>
        </div>
        <p className="absolute bottom-5 inset-x-0 text-[11px] text-white/40">اقلب الصفحة للتصفّح →</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
    </div>
  );
}

function ProductPage({ page }: { page: Extract<Page, { kind: 'product' }> }) {
  const { product, index } = page;
  const img = product.images?.[0];
  const crop = product.images_meta?.[index] ?? product.images_meta?.[0] ?? null;
  const pct = discountPercent(product.price, product.compare_at_price);
  const isPreorder = product.delivery_type === 'preorder';

  return (
    <Link href={`/products/${product.id}`} className="group block w-full h-full bg-white">
      <div className="relative h-[62%] overflow-hidden bg-luxor-obsidian">
        {img ? (
          <span className="absolute inset-0 block group-hover:scale-105 transition-transform duration-700">
            <CroppedImage src={img} crop={crop} alt={product.title} sizes="480px" />
          </span>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={56} />
          </div>
        )}
        <div className="absolute top-2 start-2 flex flex-col gap-1.5 items-start">
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
        <span className="absolute bottom-2 end-2 bg-luxor-obsidian/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full" dir="ltr">
          {index + 1}
        </span>
      </div>
      <div className="h-[38%] p-4 flex flex-col">
        {product.brand && (
          <span className="inline-block self-start bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 uppercase">
            {product.brand}
          </span>
        )}
        <h3 className="font-black text-luxor-obsidian leading-tight text-lg line-clamp-2 group-hover:text-luxor-darkgold transition">
          {product.title}
        </h3>
        <div className="flex items-center gap-3 mt-1.5 text-luxor-navy/55 text-[11px] flex-wrap">
          {product.store && (
            <span className="inline-flex items-center gap-1">
              <StoreIcon size={11} className="text-luxor-darkgold" /> {product.store.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {isPreorder ? <CalendarClock size={11} /> : <Zap size={11} />}
            {isPreorder
              ? product.delivery_days
                ? deliveryDaysLabel(product.delivery_days, 'ar')
                : 'حجز مسبق'
              : 'متاح فوراً'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Eye size={11} /> {product.views ?? 0}
          </span>
        </div>
        <span className="mt-auto inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold text-luxor-goldlight bg-luxor-obsidian border border-luxor-gold/50 px-3 py-2 rounded-xl group-hover:bg-gold-gradient group-hover:text-luxor-obsidian transition">
          <Tag size={13} /> افتح صفحة المنتج
        </span>
      </div>
    </Link>
  );
}

function BackPage({ total }: { total: number }) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-luxor-charcoal to-luxor-obsidian text-white flex flex-col items-center justify-center text-center p-6">
      <div className="absolute inset-0 pattern-egyptian opacity-15" aria-hidden />
      <BookOpen size={44} className="text-luxor-gold/60 mb-4" />
      <h3 className="text-xl font-black text-gold-gradient">نهاية الكتالوج</h3>
      <p className="text-white/60 text-sm mt-2">تصفّحت {total} منتجاً — شكراً لزيارتك</p>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
    </div>
  );
}
