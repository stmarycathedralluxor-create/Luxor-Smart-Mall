'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2, Store as StoreIcon } from 'lucide-react';
// Swiper — عارض بسيط أنيق: صور المنتجات فقط على خلفية رمادية داكنة،
// بانتقال راقٍ ومركّب (Creative: عمق + تحجيم + دوران + تلاشٍ + ظلال).
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation, Pagination, Keyboard, A11y, EffectCreative, Autoplay,
} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/effect-creative';

import type { ProductWithStore, Store } from '@/lib/types';

/** شريحة واحدة = صورة + المنتج التابع لها (منتج واحد قد يملك عدّة صور). */
type Slide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

/**
 * MagazineFlipbook — عارض كتالوج بسيط وأنيق:
 *
 *  • صور المنتجات فقط (بدون إطارات أو بيانات) على خلفية رمادية داكنة.
 *  • الصور لا تُمدَّد إطلاقاً (object-contain). عدد الصور غير محدود.
 *  • اتجاه السحب طبيعي وثابت (لا يتأثّر بتغيير اللغة).
 *  • الضغط على الكتالوج يفتحه بملء الشاشة، مع لوجو صغير أسفل اليسار
 *    ينقلك لمتجر المنتج المعروض حالياً.
 *  • متوافق تماماً مع الهواتف (سحب + استجابة كاملة).
 */
export default function MagazineFlipbook({
  title,
  products,
  store,
  coverImage,
}: {
  title: string;
  products: ProductWithStore[];
  /** متجر الكتالوج (احتياطي إن لم يكن للمنتج متجر خاص). */
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
  coverImage?: string | null;
}) {
  void coverImage;
  void title;

  // نبني الشرائح من كل صور كل المنتجات (غير محدودة) — وليس أول صورة فقط.
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    products.forEach((product) => {
      const imgs = product.images?.length ? product.images : [null];
      imgs.forEach((img, idx) => {
        out.push({ key: `${product.id}-${idx}`, img, product });
      });
    });
    return out;
  }, [products]);

  const total = slides.length;
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => setMounted(true), []);

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

  // متجر المنتج المعروض حالياً (للّوجو الصغير في ملء الشاشة).
  const activeStore = slides[activeIndex]?.product?.store ?? store ?? null;

  /* ─────────── معاينة داخل الصفحة (تُفتح بملء الشاشة عند الضغط) ─────────── */
  const preview = (
    <button
      type="button"
      onClick={() => setFullscreen(true)}
      aria-label="افتح الكتالوج بملء الشاشة"
      className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-black"
    >
      <CarouselImages slides={slides} onIndexChange={setActiveIndex} interactive={false} />
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
        <CarouselImages slides={slides} fullscreen onIndexChange={setActiveIndex} interactive />
      </div>

      {/* لوجو متجر المنتج الحالي — أسفل اليسار، ينقل لصفحة المتجر */}
      {activeStore?.slug && (
        <Link
          href={`/stores/${activeStore.slug}`}
          onClick={() => setFullscreen(false)}
          aria-label={`متجر ${activeStore.name ?? ''}`}
          className="group absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] start-3 z-[110] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pe-3 ps-1.5 text-white backdrop-blur transition hover:bg-white/20"
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

      {/* الترقيم الكسري */}
      {total > 1 && (
        <div
          className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] end-3 z-[110] rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur"
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
}: {
  slides: Slide[];
  fullscreen?: boolean;
  /** في ملء الشاشة: الضغط على الصورة يفتح صفحة المنتج. */
  interactive: boolean;
  onIndexChange?: (i: number) => void;
}) {
  const total = slides.length;

  return (
    <div className={`lsm-cat relative ${fullscreen ? 'h-full' : ''}`}>
      <Swiper
        modules={[Navigation, Pagination, Keyboard, A11y, EffectCreative, Autoplay]}
        // اتجاه ثابت (LTR) لا يتأثّر بلغة الصفحة، فيظلّ السحب طبيعياً وصحيحاً:
        // سحب لليسار = التالي، سحب لليمين = السابق.
        dir="ltr"
        slidesPerView={1}
        spaceBetween={0}
        speed={750}
        grabCursor
        loop={total > 1}
        // انتقال مركّب وأنيق: الشريحة الخارجة تتراجع للعمق وتصغر وتدور قليلاً
        // وتتلاشى، بينما الداخلة تنزلق من الجانب مع ظلّ ناعم — دون تمطيط الصورة.
        effect="creative"
        creativeEffect={{
          limitProgress: 2,
          prev: {
            shadow: true,
            translate: ['-18%', 0, -220],
            rotate: [0, 0, -4],
            scale: 0.86,
            opacity: 0.45,
          },
          next: {
            shadow: true,
            translate: ['100%', 0, 0],
            scale: 1,
            opacity: 1,
          },
        }}
        autoplay={
          fullscreen && total > 1
            ? { delay: 4500, disableOnInteraction: true, pauseOnMouseEnter: true }
            : false
        }
        keyboard={{ enabled: true }}
        navigation={total > 1 ? { nextEl: '.lsm-cat-next', prevEl: '.lsm-cat-prev' } : false}
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
                  fullscreen ? 'h-[100svh] sm:h-full' : 'aspect-square sm:aspect-[4/3]'
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

      {/* أسهم التنقّل — ثابتة الاتجاه: السابق على اليسار، التالي على اليمين */}
      {total > 1 && (
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
