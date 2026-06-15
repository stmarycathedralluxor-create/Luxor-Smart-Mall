'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Swiper as SwiperClass } from 'swiper';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2, Store as StoreIcon } from 'lucide-react';
// Swiper — عارض بسيط أنيق: صور المنتجات فقط على خلفية رمادية داكنة،
// بانتقال راقٍ ومركّب (Creative: عمق + تحجيم + دوران + تلاشٍ + ظلال).
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation, Pagination, Keyboard, A11y, Autoplay,
} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import type { ProductWithStore, Store } from '@/lib/types';

/** شريحة واحدة = صورة واحدة لكل منتج (صورة المنتج الأولى). */
type Slide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

/**
 * يبني شرائح الكتالوج: صورة واحدة فقط لكل منتج (الصورة الأولى).
 * عدد المنتجات غير محدود، لكن لكل منتج صورة واحدة في العرض.
 */
export function buildCatalogSlides(products: ProductWithStore[]): Slide[] {
  return products.map((product) => ({
    key: String(product.id),
    img: product.images?.[0] ?? null,
    product,
  }));
}

/**
 * MagazineFlipbook — عارض كتالوج بسيط وأنيق:
 *
 *  • صورة واحدة لكل منتج (بدون إطارات أو بيانات) على خلفية رمادية داكنة.
 *  • الصور لا تُمدَّد إطلاقاً (object-contain). عدد المنتجات غير محدود.
 *  • اتجاه السحب طبيعي وثابت (لا يتأثّر بتغيير اللغة).
 *  • الضغط على الكتالوج يفتحه بملء الشاشة بدءاً من نفس الصورة المعروضة.
 *  • عدّاد الصور أسفل المنتصف، ولوجو متجر المنتج الحالي أسفل اليمين.
 *  • متوافق تماماً مع الهواتف (سحب + استجابة كاملة).
 */
export default function MagazineFlipbook({
  title,
  products,
  store,
  coverImage,
  /** تشغيل تلقائي للمعاينة داخل الصفحة (الكارت يتحرّك لوحده). */
  autoPlayPreview = false,
  /** فتح ملء الشاشة تلقائياً عند فتح رابط المشاركة (?view=full أو #full). */
  autoFullscreenFromUrl = false,
}: {
  title: string;
  products: ProductWithStore[];
  /** متجر الكتالوج (احتياطي إن لم يكن للمنتج متجر خاص). */
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
  coverImage?: string | null;
  autoPlayPreview?: boolean;
  autoFullscreenFromUrl?: boolean;
}) {
  void coverImage;
  void title;

  // صورة واحدة لكل منتج (الصورة الأولى) — عدد المنتجات غير محدود.
  const slides = useMemo<Slide[]>(() => buildCatalogSlides(products), [products]);

  const total = slides.length;
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // الشريحة المعروضة في المعاينة — نفتح ملء الشاشة منها مباشرةً.
  const [activeIndex, setActiveIndex] = useState(0);
  // الفهرس الذي يبدأ منه عرض ملء الشاشة (نفس الصورة المعروضة في المعاينة).
  const [fsStartIndex, setFsStartIndex] = useState(0);

  useEffect(() => setMounted(true), []);

  // عند فتح رابط مشاركة الكتالوج (الذي يحمل ?view=full أو #full) نفتح
  // عرض ملء الشاشة مباشرةً بدل المعاينة القديمة داخل الصفحة.
  useEffect(() => {
    if (!autoFullscreenFromUrl) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wantsFull =
      params.get('view') === 'full' ||
      params.get('fullscreen') === '1' ||
      window.location.hash === '#full';
    if (wantsFull) {
      setFsStartIndex(0);
      setFullscreen(true);
    }
  }, [autoFullscreenFromUrl]);

  // منع تمرير الصفحة + Esc للخروج أثناء ملء الشاشة.
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  if (!total) return null;

  const openFullscreen = () => {
    // ابدأ ملء الشاشة من الصورة المعروضة حالياً في المعاينة.
    setFsStartIndex(activeIndex);
    setFullscreen(true);
  };

  // متجر المنتج المعروض حالياً (للّوجو الصغير في ملء الشاشة).
  const activeStore = slides[activeIndex]?.product?.store ?? store ?? null;

  /* ─────────── معاينة داخل الصفحة (تُفتح بملء الشاشة عند الضغط) ─────────── */
  const preview = (
    <button
      type="button"
      onClick={openFullscreen}
      aria-label="افتح الكتالوج بملء الشاشة"
      className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-black"
    >
      <CarouselImages
        slides={slides}
        onIndexChange={setActiveIndex}
        interactive={false}
        autoPlay={autoPlayPreview}
      />
      {/* تلميح ملء الشاشة */}
      <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-black/75">
        <Maximize2 size={14} /> ملء الشاشة
      </span>
    </button>
  );

  /* ─────────── وضع ملء الشاشة (Portal) ─────────── */
  const overlay = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-neutral-950">
      <button
        type="button"
        onClick={() => setFullscreen(false)}
        aria-label="إغلاق"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] end-3 z-[110] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <div className="flex-1 min-h-0">
        <CarouselImages
          slides={slides}
          fullscreen
          initialIndex={fsStartIndex}
          onIndexChange={setActiveIndex}
          interactive
        />
      </div>

      {/* لوجو متجر المنتج الحالي — أسفل اليمين (الجهة المقابلة)، ينقل لصفحة المتجر */}
      {activeStore?.slug && (
        <Link
          href={`/stores/${activeStore.slug}`}
          onClick={() => setFullscreen(false)}
          aria-label={`متجر ${activeStore.name ?? ''}`}
          className="group absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-3 z-[110] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pe-3 ps-1.5 text-white backdrop-blur transition hover:bg-white/20"
        >
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
            {activeStore.logo_url ? (
              <Image src={activeStore.logo_url} alt={activeStore.name ?? ''} fill sizes="36px" className="object-cover" />
            ) : (
              <StoreIcon size={16} className="text-luxor-goldlight" />
            )}
          </span>
          {activeStore.name && (
            <span className="max-w-[40vw] truncate text-xs font-bold">{activeStore.name}</span>
          )}
        </Link>
      )}

      {/* عدّاد الصور — أسفل المنتصف */}
      {total > 1 && (
        <div
          className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[110] rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur"
          dir="ltr"
        >
          {activeIndex + 1} / {total}
        </div>
      )}
    </div>
  );

  return (
    <>
      {preview}
      {fullscreen && mounted && createPortal(overlay, document.body)}
    </>
  );
}

/* ───────────────────────── Swiper carousel (الصور فقط) ───────────────────────── */
function CarouselImages({
  slides,
  fullscreen = false,
  interactive,
  onIndexChange,
  initialIndex = 0,
  autoPlay = false,
}: {
  slides: Slide[];
  fullscreen?: boolean;
  /** في ملء الشاشة: الضغط على الصورة يفتح صفحة المنتج. */
  interactive: boolean;
  onIndexChange?: (i: number) => void;
  /** الشريحة التي يبدأ منها العرض. */
  initialIndex?: number;
  /** تشغيل تلقائي حتى خارج ملء الشاشة (لتحريك كارت المعاينة لوحده). */
  autoPlay?: boolean;
}) {
  const total = slides.length;
  const swiperRef = useRef<SwiperClass | null>(null);

  // إصلاح ملء الشاشة: عند فتح العارض داخل Portal فإن Swiper قد يُهيَّأ قبل أن
  // يأخذ الحاوية أبعادها الفعلية، فتتغيّر الشريحة (والعدّاد) دون أن تتحرّك
  // الصورة فعلياً. الحلّ: إعادة قياس وتحديث Swiper بعد اكتمال تخطيط الحاوية.
  useEffect(() => {
    if (!fullscreen) return;
    const sw = swiperRef.current;
    if (!sw) return;
    let raf1 = 0;
    let raf2 = 0;
    const recalc = () => {
      if (sw.destroyed) return;
      sw.update();
      sw.updateSize();
      sw.updateSlides();
      // أعد ضبط الموضع على الشريحة الحالية بأبعاد صحيحة (بدون أنميشن).
      sw.slideToLoop(sw.realIndex, 0, false);
      // ملء الشاشة بلا تشغيل تلقائي — التنقّل يدوي فقط (سحب/أسهم/لوحة مفاتيح).
    };
    // مرّتان عبر rAF لضمان اكتمال تخطيط الـ Portal قبل القياس.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(recalc);
    });
    const onResize = () => recalc();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [fullscreen]);

  return (
    <div className={`lsm-cat relative ${fullscreen ? 'h-full' : ''}`}>
      <Swiper
        onSwiper={(sw) => {
          swiperRef.current = sw;
        }}
        modules={[Navigation, Pagination, Keyboard, A11y, Autoplay]}
        // اتجاه ثابت (LTR) لا يتأثّر بلغة الصفحة، فيظلّ السحب طبيعياً وصحيحاً:
        // سحب لليسار = التالي، سحب لليمين = السابق.
        dir="ltr"
        // ── قطار كاروسيل ──
        // انتقال انزلاقي بسيط كالقطار: الشرائح تمرّ أفقياً بسلاسة. في المعاينة
        // نُظهِر أطراف الشرائح المجاورة قليلاً ليبدو كشريط/قطار متحرّك، أمّا في
        // ملء الشاشة فشريحة واحدة كاملة لكلّ صورة.
        effect="slide"
        slidesPerView={1}
        spaceBetween={fullscreen ? 0 : 12}
        speed={650}
        grabCursor
        initialSlide={initialIndex}
        loop={total > 1}
        // مراقبة تغيّر أبعاد الحاوية/أبويها (مهمّ داخل Portal ملء الشاشة) حتى
        // يُعيد Swiper القياس تلقائياً عندما تأخذ الحاوية حجمها الفعلي.
        observer
        observeParents
        observeSlideChildren
        updateOnWindowResize
        watchOverflow={false}
        // التشغيل التلقائي للمعاينة فقط (قطار يتحرّك لوحده). ملء الشاشة بلا
        // تشغيل تلقائي إطلاقاً — التنقّل يدوي فقط (سحب/أسهم/لوحة مفاتيح).
        autoplay={
          autoPlay && !fullscreen && total > 1
            ? {
                delay: 2600,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }
            : false
        }
        keyboard={{ enabled: true }}
        navigation={fullscreen && total > 1 ? { nextEl: '.lsm-cat-next', prevEl: '.lsm-cat-prev' } : false}
        pagination={!fullscreen && total > 1 ? { clickable: true, dynamicBullets: true } : false}
        onSlideChange={(sw) => onIndexChange?.(sw.realIndex)}
        className={`lsm-cat-swiper ${fullscreen ? 'h-full' : ''}`}
      >
        {slides.map(({ key, img, product }, i) => {
          const inner = img ? (
            <Image
              src={img}
              alt={product.title}
              fill
              sizes={fullscreen ? '100vw' : '(max-width:768px) 100vw, 800px'}
              // الصور لا تُمدَّد أبداً — تُحتوى بالكامل داخل الإطار.
              className="object-contain"
              priority={i === 0}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/15">
              <StoreIcon size={72} />
            </div>
          );

          return (
            <SwiperSlide key={key}>
              <div
                className={`relative w-full ${
                  fullscreen ? 'h-full' : 'aspect-square sm:aspect-[4/3]'
                }`}
              >
                {interactive && img ? (
                  <Link href={`/products/${product.id}`} className="absolute inset-0 block" aria-label={product.title}>
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* أسهم التنقّل (في ملء الشاشة فقط) — ثابتة الاتجاه: السابق يسار، التالي يمين */}
      {fullscreen && total > 1 && (
        <>
          <button
            type="button"
            aria-label="السابق"
            onClick={(e) => e.stopPropagation()}
            className="lsm-cat-prev absolute start-2 md:start-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            aria-label="التالي"
            onClick={(e) => e.stopPropagation()}
            className="lsm-cat-next absolute end-2 md:end-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </div>
  );
}
