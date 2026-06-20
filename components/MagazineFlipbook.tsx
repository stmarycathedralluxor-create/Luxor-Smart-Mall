'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Swiper as SwiperClass } from 'swiper';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, Maximize2, Store as StoreIcon } from 'lucide-react';
// Swiper — عارض بسيط أنيق: صور المنتجات فقط على خلفية رمادية داكنة،
// بانتقال راقٍ ومركّب (Creative: عمق + تحجيم + دوران + تلاشٍ + ظلال).
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation, Pagination, Keyboard, A11y, Autoplay, FreeMode,
} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';

import { useHaptics } from '@/lib/haptics';
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
  /** وضع المشاركة: يفتح العرض بملء الشاشة فقط (بلا معاينة/خلفية) وزر الإغلاق
   *  يرجع لصفحة الكتالوج العادية بدل كشف معاينة خلفه. */
  sharedFullView = false,
}: {
  title: string;
  products: ProductWithStore[];
  /** متجر الكتالوج (احتياطي إن لم يكن للمنتج متجر خاص). */
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
  coverImage?: string | null;
  autoPlayPreview?: boolean;
  autoFullscreenFromUrl?: boolean;
  sharedFullView?: boolean;
}) {
  void coverImage;
  void title;
  const router = useRouter();

  // صورة واحدة لكل منتج (الصورة الأولى) — عدد المنتجات غير محدود.
  const slides = useMemo<Slide[]>(() => buildCatalogSlides(products), [products]);

  const total = slides.length;
  const [mounted, setMounted] = useState(false);
  // في وضع المشاركة نبدأ بملء الشاشة مباشرةً.
  const [fullscreen, setFullscreen] = useState(sharedFullView);
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
      if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  if (!total) return null;

  // إغلاق العرض: في وضع المشاركة نرجع لصفحة الكتالوج العادية (بدون #full)
  // بدل كشف معاينة خلفه؛ في الوضع العادي نُخفي ملء الشاشة فقط.
  const closeFullscreen = () => {
    if (sharedFullView) {
      const clean = typeof window !== 'undefined' ? window.location.pathname : '';
      if (clean) router.replace(clean);
      setFullscreen(false);
      return;
    }
    setFullscreen(false);
  };

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
        onClick={closeFullscreen}
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

  // وضع المشاركة: لا نعرض المعاينة إطلاقاً — العرض بملء الشاشة فقط منذ الفتح.
  if (sharedFullView) {
    return <>{fullscreen && mounted && createPortal(overlay, document.body)}</>;
  }

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
  const buzz = useHaptics();
  // نسبة تقدّم السحب الحيّة (لشريط التقدّم وتأثير الحافة).
  const [dragProgress, setDragProgress] = useState(0);

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
      // ملء الشاشة بلا loop الآن (وضع السحب الحرّ) — نستخدم slideTo مباشرةً.
      sw.slideTo(sw.activeIndex, 0, false);
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
        modules={[Navigation, Pagination, Keyboard, A11y, Autoplay, FreeMode]}
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
        // انتقال أسرع وأكثر "تشويقاً" مع easing نابض (يُضبط من الـ CSS).
        speed={fullscreen ? 380 : 560}
        grabCursor
        initialSlide={initialIndex}
        // ملء الشاشة بلا loop (لازم لوضع السحب الحرّ بالزخم). المعاينة بـ loop.
        loop={!fullscreen && total > 1}
        // ── سحب حرّ بزخم في ملء الشاشة: السحبة الواحدة قد تمرّ عدّة صور بسلاسة ──
        freeMode={
          fullscreen
            ? {
                enabled: true,
                momentum: true,
                momentumRatio: 1.1,
                momentumVelocityRatio: 1.1,
                sticky: true,
              }
            : false
        }
        // ── إحساس سحب طبيعي وإدماني ──
        // عتبة سحب أقل = استجابة أسرع للمسة. نسبة سحب أعلى = الإصبع "يقود" الشريحة.
        threshold={fullscreen ? 3 : 4}
        touchRatio={fullscreen ? 1.4 : 1.25}
        touchAngle={45}
        // ارتداد مرن عند الحواف (resistanceRatio منخفض = شدّ مطّاطي محبّب).
        resistance
        resistanceRatio={fullscreen ? 0.6 : 0.72}
        // التقاط لمسة سريعة (flick) ينقل شريحة كاملة فوراً — يشعر بالخفّة.
        followFinger
        longSwipesRatio={0.18}
        shortSwipes
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
        onSlideChange={(sw) => onIndexChange?.(fullscreen ? sw.activeIndex : sw.realIndex)}
        // لمسة اهتزازية خفيفة فور تغيّر الشريحة فعلياً (إحساس "نقرة").
        onSlideChangeTransitionStart={() => buzz('tick')}
        // تتبّع تقدّم السحب الحيّ لشريط التقدّم وإحساس الحافة (ملء الشاشة فقط).
        onSetTranslate={(sw) => {
          if (!fullscreen) return;
          if (typeof sw.progress === 'number') {
            setDragProgress(Math.min(1, Math.max(0, sw.progress)));
          }
        }}
        // ارتداد + لمسة عند بلوغ الحافة (الشريحة الأولى/الأخيرة بلا loop).
        onReachBeginning={() => buzz('snap')}
        onReachEnd={() => buzz('snap')}
        className={`lsm-cat-swiper lsm-cat-snappy ${fullscreen ? 'lsm-fs-swiper h-full' : ''}`}
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

      {/* شريط تقدّم حيّ يتحرّك مع السحب (ملء الشاشة) — إحساس "تشويقي" بالتقدّم */}
      {fullscreen && total > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-luxor-goldlight to-luxor-gold transition-[width] duration-150 ease-out"
            style={{
              width: `${total > 1 ? (dragProgress * 100) : 0}%`,
            }}
          />
        </div>
      )}

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
