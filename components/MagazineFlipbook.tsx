'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import {
  Store as StoreIcon, Tag, Zap, CalendarClock, Eye, Maximize2, Minimize2, X,
  ExternalLink, Play, Pause, LayoutGrid, ChevronLeft, ChevronRight, ZoomIn,
} from 'lucide-react';
// Swiper core + the modules that power the premium catalog experience.
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation, Pagination, Keyboard, Mousewheel, EffectCoverflow, Autoplay,
  Zoom, Thumbs, A11y, Parallax, FreeMode,
} from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-coverflow';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';

import { discountPercent, deliveryDaysLabel, formatPrice } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — عارض كتالوج فاخر مبنيّ بالكامل على Swiper:
 *
 *  • تأثير Coverflow ثلاثي الأبعاد يعطي إحساس تقليب صفحات مجلة راقية.
 *  • شريط صور مصغّرة (thumbnails) متزامن مع العرض الكبير.
 *  • تكبير الصورة (double-tap / wheel) عبر وحدة Zoom.
 *  • تشغيل تلقائي (autoplay) قابل للإيقاف، وتنقّل بالكيبورد وعجلة الماوس.
 *  • دعم RTL كامل (Swiper يقلب اتجاه السحب والأسهم تلقائياً مع dir="rtl").
 *  • وضع ملء الشاشة عبر React Portal فيغطّي كامل نافذة العرض.
 *  • شريط تقدّم + ترقيم كسري + تأثير Parallax على بيانات المنتج.
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

  const total = products.length;
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(total ? 1 / total : 0);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);

  // مرجع للـ Swiper الرئيسي حتى نتحكّم به من أزرار مخصّصة.
  const mainRef = useRef<SwiperClass | null>(null);

  useEffect(() => setMounted(true), []);

  // منع تمرير الصفحة خلف وضع ملء الشاشة.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  // Esc يخرج من ملء الشاشة.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const toggleAutoplay = useCallback(() => {
    const sw = mainRef.current;
    if (!sw?.autoplay) return;
    if (sw.autoplay.running) {
      sw.autoplay.stop();
      setPlaying(false);
    } else {
      sw.autoplay.start();
      setPlaying(true);
    }
  }, []);

  // التأثير يتغيّر بين العرض العادي وملء الشاشة:
  // العادي → coverflow أنيق، ملء الشاشة → شريحة كاملة بلا قصّ.
  const swiperKey = fullscreen ? 'fs' : 'inline';

  const stage = (
    <div className={`flex flex-col ${fullscreen ? 'h-full' : ''}`}>
      {/* شريط أدوات علوي */}
      <div className="flex items-center justify-between gap-3 mb-3 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={18} className="text-luxor-goldlight shrink-0" />
          <span className="font-bold truncate">{title}</span>
          {storeName && <span className="hidden sm:inline text-xs text-white/50">· {storeName}</span>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {total > 1 && (
            <button
              type="button"
              onClick={toggleAutoplay}
              aria-label={playing ? 'إيقاف العرض التلقائي' : 'تشغيل العرض التلقائي'}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-luxor-gold/50 text-luxor-goldlight hover:bg-luxor-gold hover:text-luxor-obsidian transition"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              <span className="hidden sm:inline">{playing ? 'إيقاف' : 'عرض تلقائي'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'تصغير' : 'ملء الشاشة'}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 border-luxor-gold/50 text-luxor-goldlight hover:bg-luxor-gold hover:text-luxor-obsidian transition"
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{fullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
          </button>
        </div>
      </div>

      {/* العرض الكبير (Coverflow) */}
      <div className="relative flex-1 min-h-0 lsm-catalog">
        {/* أسهم تنقّل مخصّصة — Swiper يربطها عبر selectors */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="السابق"
              className="lsm-prev absolute end-1 md:-end-3 top-1/2 -translate-y-1/2 z-30 inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full shadow-lg border border-luxor-gold/40 bg-white/10 backdrop-blur text-white hover:bg-luxor-gold hover:text-luxor-obsidian transition disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronRight size={24} />
            </button>
            <button
              type="button"
              aria-label="التالي"
              className="lsm-next absolute start-1 md:-start-3 top-1/2 -translate-y-1/2 z-30 inline-flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full shadow-lg border border-luxor-gold/40 bg-white/10 backdrop-blur text-white hover:bg-luxor-gold hover:text-luxor-obsidian transition disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={24} />
            </button>
          </>
        )}

        <Swiper
          key={swiperKey}
          onSwiper={(sw) => {
            mainRef.current = sw;
          }}
          modules={[
            Navigation, Pagination, Keyboard, Mousewheel, EffectCoverflow,
            Autoplay, Zoom, Thumbs, A11y, Parallax,
          ]}
          dir="rtl"
          effect="coverflow"
          grabCursor
          centeredSlides
          parallax
          slidesPerView={1}
          spaceBetween={0}
          loop={total > 2}
          speed={650}
          coverflowEffect={{
            rotate: 22,
            stretch: 0,
            depth: 180,
            modifier: 1,
            slideShadows: true,
          }}
          keyboard={{ enabled: true }}
          mousewheel={{ forceToAxis: true, thresholdDelta: 12 }}
          zoom={{ maxRatio: 3, toggle: true }}
          autoplay={{ delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true }}
          onAutoplayStart={() => setPlaying(true)}
          onAutoplayStop={() => setPlaying(false)}
          navigation={{ nextEl: '.lsm-next', prevEl: '.lsm-prev' }}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : undefined }}
          pagination={{ el: '.lsm-pagination', clickable: true, dynamicBullets: true }}
          breakpoints={{
            768: { slidesPerView: fullscreen ? 1 : 1.35 },
            1280: { slidesPerView: fullscreen ? 1 : 1.6 },
          }}
          onSlideChange={(sw) => setActiveIndex(sw.realIndex)}
          onProgress={() => {
            const sw = mainRef.current;
            if (sw && total) setProgress((sw.realIndex + 1) / total);
          }}
          className={`!overflow-visible ${fullscreen ? 'h-full' : ''}`}
        >
          {products.map((product, i) => (
            <SwiperSlide key={product.id}>
              <CatalogSlide product={product} index={i} fullscreen={fullscreen} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* الشريط السفلي: بيانات المنتج الحالي + زر الفتح */}
      {products[activeIndex] && <ProductBar product={products[activeIndex]} />}

      {/* شريط الصور المصغّرة */}
      {total > 1 && (
        <div className="mt-3">
          <Swiper
            onSwiper={setThumbsSwiper}
            modules={[Thumbs, FreeMode, A11y]}
            dir="rtl"
            watchSlidesProgress
            slidesPerView="auto"
            spaceBetween={8}
            freeMode
            className="lsm-thumbs !px-0.5"
          >
            {products.map((product, i) => (
              <SwiperSlide key={product.id} className="!w-16 md:!w-20">
                <Thumb product={product} index={i} active={i === activeIndex} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* ترقيم Swiper الديناميكي */}
      {total > 1 && <div className="lsm-pagination mt-3 flex items-center justify-center" />}

      {/* شريط التقدّم + الترقيم الكسري */}
      <div className="mt-3 flex items-center gap-3 text-white/70">
        <span className="text-xs font-bold whitespace-nowrap inline-flex items-center gap-1" dir="ltr">
          <LayoutGrid size={12} className="text-luxor-goldlight" />
          {activeIndex + 1} / {total}
        </span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/15">
          <div
            className="h-full bg-gold-gradient transition-all duration-500"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  // الوضع العادي: مسرح داكن داخل الصفحة.
  if (!fullscreen) {
    return (
      <div className="relative rounded-3xl bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian p-4 md:p-6 shadow-luxor-lg">
        <div className="absolute inset-0 pattern-egyptian opacity-10 rounded-3xl pointer-events-none" aria-hidden />
        <div className="relative">{stage}</div>
      </div>
    );
  }

  // ملء الشاشة عبر Portal.
  if (mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-black/92 backdrop-blur-md flex flex-col p-3 md:p-6">
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

/* ───────────────────────── Slide (الصورة الكبيرة) ───────────────────────── */
function CatalogSlide({
  product,
  index,
  fullscreen,
}: {
  product: ProductWithStore;
  index: number;
  fullscreen: boolean;
}) {
  const img = product.images?.[0];
  const pct = discountPercent(product.price, product.compare_at_price);

  return (
    <div
      className={`relative w-full mx-auto rounded-3xl overflow-hidden border border-luxor-gold/25 bg-black/40 ${
        fullscreen ? 'h-[72vh]' : 'aspect-[4/3]'
      }`}
    >
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

      {/* الصورة الرئيسية — قابلة للتكبير (Swiper Zoom) */}
      <div className="swiper-zoom-container absolute inset-0">
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width:768px) 100vw, 900px"
            className="object-contain p-3 md:p-5"
            priority={index === 0}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={72} />
          </div>
        )}
      </div>

      {/* الشارات (Parallax — تتحرّك بسلاسة مع الانتقال) */}
      <div className="absolute top-3 start-3 flex flex-col gap-1.5 items-start z-10" data-swiper-parallax="-80">
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

      <span
        className="absolute top-3 end-3 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur z-10"
        dir="ltr"
      >
        {index + 1}
      </span>

      {/* تلميحات: تكبير + فتح صفحة المنتج */}
      <span className="absolute bottom-3 end-3 inline-flex items-center gap-1.5 bg-black/50 text-white/90 border border-white/20 px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur z-10 pointer-events-none">
        <ZoomIn size={12} /> اضغط مرّتين للتكبير
      </span>

      <Link
        href={`/products/${product.id}`}
        className="absolute bottom-3 start-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 bg-luxor-obsidian/80 text-luxor-goldlight border border-luxor-gold/40 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur hover:bg-luxor-gold hover:text-luxor-obsidian transition"
      >
        <ExternalLink size={13} /> افتح صفحة المنتج
      </Link>
    </div>
  );
}

/* ───────────────────────── Thumbnail ───────────────────────── */
function Thumb({
  product,
  index,
  active,
}: {
  product: ProductWithStore;
  index: number;
  active: boolean;
}) {
  const img = product.images?.[0];
  return (
    <div
      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition ${
        active ? 'border-luxor-gold opacity-100' : 'border-white/15 opacity-60 hover:opacity-100'
      }`}
    >
      {img ? (
        <Image src={img} alt={product.title} fill sizes="80px" className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black/40 text-luxor-gold/40">
          <StoreIcon size={20} />
        </div>
      )}
      <span className="absolute bottom-0.5 end-0.5 bg-black/60 text-white text-[9px] font-bold px-1 rounded" dir="ltr">
        {index + 1}
      </span>
    </div>
  );
}

/* ───────────────────────── Product info bar ───────────────────────── */
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
