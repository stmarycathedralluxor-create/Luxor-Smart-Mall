'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Maximize2, Store as StoreIcon } from 'lucide-react';
// Swiper — تأثير "Expo" (UI Initiative) بنافذة تتمدّد بأناقة دون تشويه الصورة.
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Keyboard, A11y } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper/types';
import 'swiper/css';

import type { ProductWithStore } from '@/lib/types';

/**
 * MagazineFlipbook — عارض كتالوج أنيق بتأثير "Expo":
 *
 *  • صور المنتجات فقط على خلفية رمادية داكنة (بدون إطارات أو بيانات).
 *  • انتقال "نافذة تتّسع" راقٍ مستوحى من expo-slider.uiinitiative.com:
 *    الإطار ينزلق بينما تتحرّك الصورة عكسياً فتبقى ثابتة بصرياً دون تمطيط.
 *  • الصور تُحتوى بالكامل (object-contain) — لا تمطيط ولا قصّ.
 *  • الضغط على الكتالوج يفتحه بملء الشاشة (Portal).
 *  • متوافق تماماً مع الهواتف (سحب + استجابة كاملة).
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
  void storeName;
  void title;

  const total = products.length;
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

  /* ─────────── معاينة داخل الصفحة (تُفتح بملء الشاشة عند الضغط) ─────────── */
  const preview = (
    <button
      type="button"
      onClick={() => setFullscreen(true)}
      aria-label="افتح الكتالوج بملء الشاشة"
      className="group relative block w-full overflow-hidden rounded-[16px] md:rounded-[32px] bg-[#0f0f11]"
    >
      <ExpoCarousel products={products} onIndexChange={setActiveIndex} interactive={false} />
      <span className="pointer-events-none absolute top-3 end-3 z-30 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-black/75">
        <Maximize2 size={14} /> ملء الشاشة
      </span>
    </button>
  );

  /* ─────────── وضع ملء الشاشة (Portal) ─────────── */
  const overlay = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0f0f11]">
      <button
        type="button"
        onClick={() => setFullscreen(false)}
        aria-label="إغلاق"
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] end-3 z-[120] inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={20} />
      </button>

      <div className="flex flex-1 min-h-0 items-center justify-center px-3 sm:px-6">
        <ExpoCarousel products={products} fullscreen onIndexChange={setActiveIndex} interactive />
      </div>

      {total > 1 && (
        <div
          className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] start-1/2 z-[120] -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur"
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

/* ───────────────────────── Expo carousel ─────────────────────────
   يحاكي تأثير Expo: نُعطّل تحريك الـ wrapper (virtualTranslate) ونطبّق
   التحويلات يدوياً لكل شريحة عبر أحداث setTranslate / setTransition:
     • الإطار (container) ينزلق بمقدار progress * 100%.
     • الصورة داخله تتحرّك عكسياً بمقدار progress * imageOffset * 100%
       فتبدو ثابتة بصرياً بينما "تتّسع النافذة" — دون أي تمطيط للصورة. */
// مقدار حركة الـ parallax للصورة عكس اتجاه النافذة. قيمة معتدلة (0.3)
// تمنح إحساس Expo نفسه (نافذة تتّسع) مع إبقاء الصورة محتواة بالكامل دون قصّ.
const IMAGE_OFFSET = 0.3;

function ExpoCarousel({
  products,
  fullscreen = false,
  interactive,
  onIndexChange,
}: {
  products: ProductWithStore[];
  fullscreen?: boolean;
  /** الضغط على الصورة يفتح صفحة المنتج. */
  interactive: boolean;
  onIndexChange?: (i: number) => void;
}) {
  const total = products.length;
  const router = useRouter();
  const swiperRef = useRef<SwiperClass | null>(null);
  // يميّز السحب عن النقر حتى لا يفتح الرابط أثناء التمرير.
  const dragged = useRef(false);

  const applyExpo = (sw: SwiperClass) => {
    const isHorizontal = sw.isHorizontal();
    // RTL: Swiper يضبط rtlTranslate، نراعيه في اتجاه التحويل.
    const rtl = sw.rtlTranslate ? -1 : 1;
    for (let i = 0; i < sw.slides.length; i += 1) {
      const slide = sw.slides[i] as HTMLElement;
      const progress = Math.max(Math.min((slide as any).progress as number, 1), -1);
      const container = slide.querySelector<HTMLElement>('.expo-container');
      const image = slide.querySelector<HTMLElement>('.expo-image');
      const axis = isHorizontal ? 'X' : 'Y';
      const p = progress * rtl;
      if (container) {
        container.style.transform = `translate${axis}(${p * 100}%)`;
      }
      if (image) {
        image.style.transform = `translate${axis}(${-p * IMAGE_OFFSET * 100}%)`;
      }
    }
  };

  const setExpoTransition = (sw: SwiperClass, duration: number) => {
    for (let i = 0; i < sw.slides.length; i += 1) {
      const slide = sw.slides[i] as HTMLElement;
      slide.querySelectorAll<HTMLElement>('.expo-container, .expo-image').forEach((el) => {
        el.style.transitionDuration = `${duration}ms`;
      });
    }
  };

  return (
    <div
      className={`lsm-expo relative w-full ${
        fullscreen
          ? 'h-full max-h-full mx-auto aspect-[9/16] sm:aspect-video sm:h-full'
          : 'aspect-square sm:aspect-video'
      }`}
    >
      <Swiper
        modules={[Navigation, Keyboard, A11y]}
        onSwiper={(sw) => {
          swiperRef.current = sw;
          applyExpo(sw);
        }}
        dir="rtl"
        slidesPerView={1}
        spaceBetween={0}
        speed={650}
        grabCursor
        loop={total > 1}
        virtualTranslate
        watchSlidesProgress
        keyboard={{ enabled: true }}
        navigation={total > 1 ? { nextEl: '.lsm-expo-next', prevEl: '.lsm-expo-prev' } : false}
        onSetTranslate={(sw) => applyExpo(sw)}
        onSetTransition={(sw, duration) => setExpoTransition(sw, duration)}
        onTouchStart={() => {
          dragged.current = false;
        }}
        onTouchMove={() => {
          dragged.current = true;
        }}
        onSlideChange={(sw) => onIndexChange?.(sw.realIndex)}
        className="h-full w-full"
      >
        {products.map((product, i) => {
          const img = product.images?.[0];
          return (
            <SwiperSlide key={product.id}>
              <div
                className="expo-container h-full w-full"
                onClick={() => {
                  if (interactive && img && !dragged.current) {
                    router.push(`/products/${product.id}`);
                  }
                }}
                role={interactive ? 'link' : undefined}
                aria-label={interactive ? product.title : undefined}
              >
                {img ? (
                  <div className="expo-image">
                    <Image
                      src={img}
                      alt={product.title}
                      fill
                      sizes={fullscreen ? '100vw' : '(max-width:768px) 100vw, 900px'}
                      // الصور لا تُمطّط ولا تُقصّ — تُحتوى بالكامل داخل النافذة.
                      className="object-contain"
                      priority={i === 0}
                    />
                  </div>
                ) : (
                  <div className="expo-image flex items-center justify-center text-white/15">
                    <StoreIcon size={72} />
                  </div>
                )}
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* أسهم التنقّل — تظهر على الشاشات الأكبر، والسحب يكفي على الهاتف */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="السابق"
            className="lsm-expo-prev absolute end-2 md:end-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
          >
            <ChevronRight size={24} />
          </button>
          <button
            type="button"
            aria-label="التالي"
            className="lsm-expo-next absolute start-2 md:start-4 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
          >
            <ChevronLeft size={24} />
          </button>
        </>
      )}
    </div>
  );
}
