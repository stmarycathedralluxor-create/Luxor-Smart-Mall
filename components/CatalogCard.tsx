'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Swiper as SwiperClass } from 'swiper';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Sparkles, Store as StoreIcon, Maximize2,
  X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import {
  Navigation, Pagination, Keyboard, A11y, Autoplay, FreeMode, Thumbs,
} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/free-mode';
import 'swiper/css/thumbs';

import { buildCatalogSlides } from '@/components/MagazineFlipbook';
import ShareButton from '@/components/ShareButton';
import { useHaptics } from '@/lib/haptics';
import type { ProductWithStore, Store } from '@/lib/types';

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * CatalogCard — كارت كتالوج تفاعلي في صفحة الكتالوجات الرئيسية:
 *
 *  • يعرض صور المنتجات (صورة واحدة لكل منتج) ويتحرّك لوحده تلقائياً.
 *  • الضغط عليه يفتح وضع ملء الشاشة مباشرةً — بدءاً من نفس الصورة المعروضة.
 *  • داخل ملء الشاشة: الضغط على الصورة يفتح صفحة المنتج، ولوجو متجر المنتج
 *    الحالي أسفل اليمين، وعدّاد الصور أسفل المنتصف.
 */
export default function CatalogCard({
  title,
  slug,
  products,
  store,
  count,
}: {
  title: string;
  slug: string;
  products: ProductWithStore[];
  store?: CardStore;
  count: number;
}) {
  const slides = useMemo(() => buildCatalogSlides(products), [products]);
  const total = slides.length;
  const buzz = useHaptics();

  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // عدّاد الكارت المتحرّك تلقائياً (الـ autoplay) — منفصل تماماً عن عدّاد ملء الشاشة.
  const [cardIndex, setCardIndex] = useState(0);
  // عدّاد ملء الشاشة — يتحدّث فقط من سلايدر ملء الشاشة (تنقّل يدوي) ولا يعدّ لوحده.
  const [fsIndex, setFsIndex] = useState(0);
  const [fsStartIndex, setFsStartIndex] = useState(0);
  // سلايدر المصغّرات المتزامن مع العرض الرئيسي في ملء الشاشة.
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);

  useEffect(() => setMounted(true), []);

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
    // نبدأ ملء الشاشة من نفس الصورة المعروضة حالياً في الكارت المتحرّك.
    setFsStartIndex(cardIndex);
    setFsIndex(cardIndex);
    setFullscreen(true);
    buzz('medium');
  };

  // متجر/عدّاد ملء الشاشة يعتمد على fsIndex فقط — لا يتأثر بحركة الكارت التلقائية.
  const activeStore = slides[fsIndex]?.product?.store ?? store ?? null;

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
        <div className="lsm-cat relative h-full">
          <Swiper
            modules={[Navigation, Keyboard, A11y, FreeMode, Thumbs]}
            dir="ltr"
            // قطار كاروسيل: انزلاق أفقي بسيط كالقطار.
            effect="slide"
            slidesPerView={1}
            spaceBetween={0}
            // انتقال سريع وسلس.
            speed={380}
            grabCursor
            initialSlide={fsStartIndex}
            loop={false}
            // ── سحب حرّ بزخم: السحبة الواحدة قد تمرّ عدّة صور بسلاسة ──
            freeMode={{
              enabled: true,
              momentum: true,
              momentumRatio: 1.1,
              momentumVelocityRatio: 1.1,
              sticky: true, // يستقرّ على أقرب صورة بعد التوقّف
            }}
            threshold={3}
            touchRatio={1.4}
            touchAngle={45}
            resistanceRatio={0.6}
            followFinger
            // تزامن مع شريط المصغّرات.
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            autoplay={false}
            keyboard={{ enabled: true }}
            navigation={total > 1 ? { nextEl: '.lsm-fs-next', prevEl: '.lsm-fs-prev' } : false}
            onSlideChange={(sw) => setFsIndex(sw.activeIndex)}
            onSlideChangeTransitionStart={() => buzz('tick')}
            className="lsm-cat-swiper lsm-cat-snappy lsm-fs-swiper h-full"
          >
            {slides.map(({ key, img, product }, i) => {
              const inner = img ? (
                <Image
                  src={img}
                  alt={product.title}
                  fill
                  sizes="100vw"
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
                  <div className="relative w-full h-full">
                    {img ? (
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

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="السابق"
                onClick={(e) => e.stopPropagation()}
                className="lsm-fs-prev absolute start-2 md:start-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                aria-label="التالي"
                onClick={(e) => e.stopPropagation()}
                className="lsm-fs-next absolute end-2 md:end-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition hover:bg-black/70 sm:inline-flex"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* شريط المصغّرات أسفل الكاروسيل */}
      {total > 1 && (
        <div className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          <Swiper
            modules={[FreeMode, Thumbs, A11y]}
            onSwiper={setThumbsSwiper}
            dir="ltr"
            spaceBetween={8}
            slidesPerView="auto"
            freeMode
            watchSlidesProgress
            className="lsm-fs-thumbs !mx-auto max-w-3xl"
          >
            {slides.map(({ key, img, product }) => (
              <SwiperSlide key={`thumb-${key}`} className="!w-16 !h-16 sm:!w-20 sm:!h-20">
                <div className="relative h-full w-full bg-neutral-800">
                  {img ? (
                    <Image
                      src={img}
                      alt={product.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/20">
                      <StoreIcon size={20} />
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* لوجو متجر المنتج الحالي — أعلى اليسار (شريط المصغّرات يشغل الأسفل) */}
      {activeStore?.slug && (
        <Link
          href={`/stores/${activeStore.slug}`}
          onClick={() => setFullscreen(false)}
          aria-label={`متجر ${activeStore.name ?? ''}`}
          className="group absolute top-[max(0.75rem,env(safe-area-inset-top))] start-3 z-[110] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pe-3 ps-1.5 text-white backdrop-blur transition hover:bg-white/20"
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

      {/* عدّاد الصور — أعلى المنتصف (الأسفل لشريط المصغّرات) */}
      {total > 1 && (
        <div
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[110] rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur"
          dir="ltr"
        >
          {fsIndex + 1} / {total}
        </div>
      )}
    </div>
  );

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden border border-luxor-gold/20 shadow-sm hover:shadow-luxor-lg hover:border-luxor-gold/50 transition-all">
      {/* الكارت المتحرّك لوحده — الضغط عليه يفتح ملء الشاشة من نفس الصورة */}
      <button
        type="button"
        onClick={openFullscreen}
        aria-label={`افتح كتالوج ${title} بملء الشاشة`}
        className="block w-full text-start"
      >
        <div className="lsm-cat-card-wrap relative m-2 mb-0 aspect-[4/5] overflow-hidden rounded-2xl bg-luxor-obsidian">
          <div className="lsm-cat lsm-cat-card absolute inset-0">
            <Swiper
              modules={[Pagination, A11y, Autoplay]}
              dir="ltr"
              // قطار كاروسيل يتحرّك لوحده: انزلاق أفقي بسيط كالقطار.
              effect="slide"
              slidesPerView={1}
              spaceBetween={0}
              speed={560}
              loop={total > 1}
              // الكارت قابل للسحب يدوياً أيضاً (أكثر "تفاعلية وإدماناً").
              allowTouchMove
              grabCursor
              threshold={4}
              touchRatio={1.2}
              resistance
              resistanceRatio={0.7}
              followFinger
              shortSwipes
              longSwipesRatio={0.2}
              // يتوقف الكارت عن الحركة التلقائية أثناء فتح ملء الشاشة حتى لا يعدّ في الخلفية.
              autoplay={
                total > 1 && !fullscreen
                  ? { delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true }
                  : false
              }
              onSlideChange={(sw) => setCardIndex(sw.realIndex)}
              onTouchStart={() => buzz('soft')}
              onSlideChangeTransitionStart={(sw) => {
                // لمسة خفيفة فقط عند السحب اليدوي (لا أثناء التشغيل التلقائي).
                if (sw.animating && (sw as any).touchEventsData?.isTouched) buzz('tick');
              }}
              className="lsm-cat-swiper lsm-cat-snappy h-full"
            >
              {slides.map(({ key, img, product }, i) => (
                <SwiperSlide key={key}>
                  <div className="relative w-full h-full">
                    {img ? (
                      <Image
                        src={img}
                        alt={product.title}
                        fill
                        sizes="(max-width:768px) 100vw, 33vw"
                        // تملأ عرض الكارت بالكامل من الأعلى — بلا حواف سوداء.
                        className="object-cover object-top"
                        priority={i === 0}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/15">
                        <BookOpen size={48} />
                      </div>
                    )}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* تدرّج + شارة + عنوان فوق الصورة */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-luxor-obsidian/95 via-luxor-obsidian/20 to-transparent" />
          <span className="pointer-events-none absolute top-3 start-3 z-10 inline-flex items-center gap-1 bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[11px] font-bold">
            <BookOpen size={12} /> كتالوج
          </span>
          <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur transition group-hover:bg-black/75">
            <Maximize2 size={13} /> ملء الشاشة
          </span>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
            <h3 className="font-black text-white text-xl leading-tight line-clamp-2">{title}</h3>
            <div className="flex items-center gap-3 mt-2 text-white/70 text-xs flex-wrap">
              {store?.name && (
                <span className="inline-flex items-center gap-1">
                  <StoreIcon size={12} className="text-luxor-goldlight" /> {store.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Sparkles size={12} className="text-luxor-goldlight" /> {count} منتج
              </span>
            </div>
          </div>
        </div>
      </button>

      <div className="p-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openFullscreen}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-luxor-darkgold hover:text-luxor-obsidian transition"
        >
          <Maximize2 size={15} /> افتح بملء الشاشة
        </button>
        <ShareButton
          variant="icon"
          path={`/catalog/${slug}?view=full`}
          title={title}
          text={`تصفّح كتالوج «${title}» على الأقصر سمارت مول`}
          label="مشاركة الكتالوج"
        />
      </div>

      {fullscreen && mounted && createPortal(overlay, document.body)}
    </div>
  );
}
