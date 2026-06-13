'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft, ChevronRight, Store as StoreIcon, Tag, Zap, CalendarClock,
  Eye, Maximize2, Minimize2, X, ExternalLink,
} from 'lucide-react';
import { discountPercent, deliveryDaysLabel, formatPrice } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — عارض كتالوج أنيق بأسلوب "زووم/لايت بوكس":
 *
 * - خلفية داكنة شبه شفافة (stage) تُبرز صورة المنتج مثل معاينة الصور.
 * - انتقال شيك بين المنتجات (انزلاق + تلاشٍ خفيف) بدل قلب صفحات المجلة.
 * - أزرار التنقّل مهيّأة لاتجاه RTL بدقّة:
 *     • التالي (forward) على اليسار، السهم ◄ (ChevronLeft).
 *     • السابق (back) على اليمين، السهم ► (ChevronRight).
 * - وضع ملء الشاشة عبر React Portal إلى document.body فيغطّي كامل الشاشة.
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
  // اتجاه آخر انتقال (لأنميشن الدخول): 'fwd' = للأمام، 'back' = للخلف
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const touchStartX = useRef<number | null>(null);

  const total = products.length;
  const maxIndex = Math.max(0, total - 1);

  useEffect(() => setMounted(true), []);

  const goNext = useCallback(() => {
    setDir('fwd');
    setCurrent((c) => Math.min(maxIndex, c + 1));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setDir('back');
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const goTo = useCallback((i: number) => {
    setCurrent((c) => {
      setDir(i >= c ? 'fwd' : 'back');
      return Math.max(0, Math.min(maxIndex, i));
    });
  }, [maxIndex]);

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
  const product = products[current];

  const stage = (
    <div className={`flex flex-col ${fullscreen ? 'h-full' : ''}`}>
      {/* شريط أدوات */}
      <div className="flex items-center justify-between gap-3 mb-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={18} className="text-luxor-goldlight" />
          <span className="font-bold truncate">{title}</span>
          {storeName && <span className="hidden sm:inline text-xs text-white/50">· {storeName}</span>}
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((f) => !f)}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-luxor-gold/50 text-luxor-goldlight hover:bg-luxor-gold hover:text-luxor-obsidian transition"
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {fullscreen ? 'تصغير' : 'ملء الشاشة'}
        </button>
      </div>

      {/* الـ stage (الصورة الكبيرة) */}
      <div
        className="relative flex-1 flex items-center justify-center min-h-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* السابق — على اليمين في RTL (►) */}
        <NavArrow dir="prev" onClick={goPrev} disabled={current <= 0} />

        <div
          className={`relative w-full mx-auto ${fullscreen ? 'max-w-4xl' : 'max-w-2xl'} rounded-3xl overflow-hidden border border-luxor-gold/25 bg-black/40 ${
            fullscreen ? 'h-full max-h-[78vh]' : 'aspect-[4/3]'
          }`}
        >
          {product && (
            <ProductStage key={product.id} product={product} index={current} dir={dir} />
          )}
        </div>

        {/* التالي — على اليسار في RTL (◄) */}
        <NavArrow dir="next" onClick={goNext} disabled={current >= maxIndex} />
      </div>

      {/* الشريط السفلي: بيانات المنتج + زر الفتح */}
      {product && <ProductBar product={product} />}

      {/* نقاط الترقيم */}
      {total > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap max-w-full px-2">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`المنتج ${i + 1}`}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current ? 'w-7 h-2 bg-gold-gradient' : 'w-2 h-2 bg-white/25 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* شريط التقدّم */}
      <div className="mt-3 flex items-center gap-3 text-white/70">
        <span className="text-xs font-bold whitespace-nowrap" dir="ltr">
          {current + 1} / {total}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/15">
          <div className="h-full bg-gold-gradient transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );

  // الوضع العادي: مسرح داكن شبه شفاف داخل الصفحة (زي معاينة الصور)
  if (!fullscreen) {
    return (
      <div className="relative rounded-3xl bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian p-4 md:p-6 shadow-luxor-lg">
        <div className="absolute inset-0 pattern-egyptian opacity-10 rounded-3xl pointer-events-none" aria-hidden />
        <div className="relative">{stage}</div>
      </div>
    );
  }

  // ملء الشاشة عبر Portal — يغطّي كامل نافذة العرض
  if (mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col p-3 md:p-6">
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          aria-label="إغلاق ملء الشاشة"
          className="absolute top-3 end-3 z-[110] inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20 transition"
        >
          <X size={18} />
        </button>
        <div className="flex-1 min-h-0">{stage}</div>
      </div>,
      document.body,
    );
  }

  return null;
}

function NavArrow({
  dir,
  onClick,
  disabled,
}: {
  dir: 'next' | 'prev';
  onClick: () => void;
  disabled: boolean;
}) {
  // RTL: السابق (back) على اليمين بسهم ►، التالي (forward) على اليسار بسهم ◄
  const pos = dir === 'prev' ? 'end-1 md:-end-5' : 'start-1 md:-start-5';
  const Icon = dir === 'prev' ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'السابق' : 'التالي'}
      className={`absolute ${pos} top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full shadow-lg border border-luxor-gold/40 bg-white/10 backdrop-blur text-white hover:bg-luxor-gold hover:text-luxor-obsidian transition disabled:opacity-20 disabled:cursor-not-allowed`}
    >
      <Icon size={24} />
    </button>
  );
}

function ProductStage({
  product,
  index,
  dir,
}: {
  product: ProductWithStore;
  index: number;
  dir: 'fwd' | 'back';
}) {
  const img = product.images?.[0];
  const pct = discountPercent(product.price, product.compare_at_price);
  // أنميشن الدخول حسب اتجاه الانتقال (RTL: للأمام = يدخل من اليسار)
  const enter = dir === 'fwd' ? 'animate-slide-in-fwd' : 'animate-slide-in-back';

  return (
    <Link href={`/products/${product.id}`} className={`group absolute inset-0 block ${enter}`}>
      {/* خلفية ضبابية من الصورة نفسها لملء الفراغ بأناقة */}
      {img && (
        <Image
          src={img}
          alt=""
          fill
          aria-hidden
          sizes="900px"
          className="object-cover scale-125 blur-2xl opacity-30"
        />
      )}
      {img ? (
        <Image
          src={img}
          alt={product.title}
          fill
          sizes="(max-width:768px) 100vw, 900px"
          className="object-contain p-3 md:p-5 transition-transform duration-500 group-hover:scale-[1.02]"
          priority
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-luxor-gold/30">
          <StoreIcon size={72} />
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
      <span className="absolute top-3 end-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur" dir="ltr">
        {index + 1}
      </span>

      {/* تلميح فتح الصفحة عند المرور */}
      <span className="absolute bottom-3 start-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition inline-flex items-center gap-1.5 bg-luxor-obsidian/80 text-luxor-goldlight border border-luxor-gold/40 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur">
        <ExternalLink size={13} /> افتح صفحة المنتج
      </span>
    </Link>
  );
}

function ProductBar({ product }: { product: ProductWithStore }) {
  const pct = discountPercent(product.price, product.compare_at_price);
  const isPreorder = product.delivery_type === 'preorder';
  return (
    <div className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-3.5 md:p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {product.brand && (
            <span className="inline-block bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 uppercase">
              {product.brand}
            </span>
          )}
          <h3 className="font-black text-white leading-tight text-lg md:text-xl line-clamp-1">
            {product.title}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-white/55 text-[11px] md:text-xs flex-wrap">
            {product.store && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={12} className="text-luxor-goldlight" /> {product.store.name}
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
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <div className="text-xl md:text-2xl font-black text-luxor-goldlight">
              {formatPrice(product.price)}
            </div>
            {pct !== null && product.compare_at_price && (
              <div className="text-xs text-white/40 line-through">
                {formatPrice(product.compare_at_price)}
              </div>
            )}
          </div>
          <Link
            href={`/products/${product.id}`}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-luxor-obsidian bg-gold-gradient px-4 py-2.5 rounded-xl hover:opacity-90 transition"
          >
            <Tag size={14} /> افتح
          </Link>
        </div>
      </div>
    </div>
  );
}
