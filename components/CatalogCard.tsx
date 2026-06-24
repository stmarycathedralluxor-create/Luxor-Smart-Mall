'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Sparkles, Store as StoreIcon, Maximize2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import CatalogLightbox from '@/components/CatalogLightbox';
import ShareButton from '@/components/ShareButton';
import { useLocale } from '@/components/LocaleProvider';
import { useHaptics } from '@/lib/haptics';
import { buildCatalogSlides, type CardStore } from '@/lib/catalog';
import type { ProductWithStore } from '@/lib/types';

/**
 * CatalogCard — كارت كتالوج كبير (نسبة 3:4)، Mobile-First، مبني على:
 *
 *  • Embla Carousel → معاينة تلقائية + سحب طبيعي باللمس بين صور المنتجات.
 *  • Motion (Framer) → ضغط لطيف عند النقر.
 *  • <img> أصلية مع loading كسول → تحميل صور موثوق وسريع من الـ CDN مباشرةً.
 *
 *  إصلاح جوهري: لم نعد نلفّ الكاروسيل داخل <button> (كان يبتلع لفتة السحب،
 *  فلا يعمل التمرير ويفتح ملء الشاشة فوراً). الآن منطقة الصور قابلة للسحب
 *  فعلاً، والنقرة الحقيقية (لا السحب) هي ما يفتح ملء الشاشة — نميّزها بقياس
 *  مسافة حركة المؤشّر بين الضغط والرفع.
 *
 *  مزامنة كاملة مع العارض بملء الشاشة (CatalogLightbox) عبر فهرس مشترك واحد.
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
  const { t } = useLocale();
  const { locale } = useLocale();
  const slides = useMemo(() => buildCatalogSlides(products), [products]);
  const total = slides.length;
  const buzz = useHaptics();
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  // فهرس مشترك بين الكارت والعارض بملء الشاشة (مصدر الحقيقة الواحد للمزامنة).
  const [index, setIndex] = useState(0);

  // Embla: snap محكم + تشغيل تلقائي يتوقّف عند فتح العارض/التفاعل.
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 3200,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    []
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: total > 1, align: 'center', containScroll: false, dragFree: false },
    total > 1 ? [autoplay] : []
  );

  // تتبّع شريحة الكارت → تحدّث الفهرس المشترك.
  const onSelect = useCallback(() => {
    if (emblaApi) setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // إيقاف autoplay أثناء فتح العارض، وإعادة الكارت لنفس الصورة عند الإغلاق.
  useEffect(() => {
    const ap = emblaApi?.plugins?.()?.autoplay as
      | { play: () => void; stop: () => void }
      | undefined;
    if (open) {
      ap?.stop();
    } else {
      if (emblaApi && emblaApi.selectedScrollSnap() !== index) {
        emblaApi.scrollTo(index, true);
      }
      ap?.play();
    }
  }, [open, emblaApi, index]);

  // ── تمييز النقرة من السحب: نفتح ملء الشاشة فقط عند نقرة حقيقية ──
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }, []);
  const openFullscreen = useCallback(() => {
    setOpen(true);
    buzz('medium');
  }, [buzz]);
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      // تحرّك بسيط (< 8px) ⇒ نقرة ⇒ افتح ملء الشاشة. غير ذلك = سحب/تمرير.
      if (dx < 8 && dy < 8) openFullscreen();
    },
    [openFullscreen]
  );
  // إلغاء النقرة عند تولّي المتصفّح للإيماءة (تمرير) أو خروج المؤشّر.
  const cancelTap = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    buzz('tick');
  }, [emblaApi, buzz]);
  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
    buzz('tick');
  }, [emblaApi, buzz]);

  if (!total) return null;

  // متجر المنتج المعروض حالياً (للّوجو في العارض).
  const activeStore = slides[index]?.product?.store ?? store ?? null;

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative flex flex-col rounded-3xl bg-white border border-luxor-gold/20 shadow-[0_8px_30px_-12px_rgba(10,10,10,0.25)] hover:shadow-[0_24px_60px_-18px_rgba(212,175,55,0.45)] hover:border-luxor-gold/50 transition-shadow duration-300"
    >
      {/* الكارت الكبير 3:4 — السحب يبدّل الصور، والنقر يفتح ملء الشاشة */}
      <div className="relative m-2 mb-0 aspect-[3/4] overflow-hidden rounded-2xl bg-luxor-obsidian">
        {/* Embla viewport — قابل للسحب فعلاً (ليس داخل زر) */}
        <div
          className="lsm-embla h-full w-full cursor-pointer overflow-hidden"
          ref={emblaRef}
          role="button"
          tabIndex={0}
          aria-label={`${title} — ${t.common.openFullscreen}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelTap}
          onPointerLeave={cancelTap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFullscreen();
            }
          }}
        >
          <div className="lsm-embla__container flex h-full">
            {slides.map(({ key, img, product }, i) => (
              <div
                key={key}
                className="lsm-embla__slide relative h-full min-w-0 flex-[0_0_100%]"
              >
                {img ? (
                  <motion.div
                    className="relative h-full w-full"
                    initial={false}
                    animate={{ scale: i === index ? 1 : 1.04 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={product.title}
                      className="h-full w-full select-none object-cover"
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </motion.div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/15">
                    <BookOpen size={48} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* تدرّج + شارة + عنوان فوق الصورة */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-luxor-obsidian/95 via-luxor-obsidian/20 to-transparent" />
        <span className="pointer-events-none absolute top-3 start-3 z-10 inline-flex items-center gap-1 bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[11px] font-bold">
          <BookOpen size={12} /> {t.common.catalog}
        </span>
        <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur transition group-hover:bg-black/75">
          <Maximize2 size={13} /> {t.common.fullscreen}
        </span>

        {/* أزرار تنقّل (تظهر على الأجهزة المزوّدة بمؤشّر) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={locale === 'ar' ? scrollNext : scrollPrev}
              aria-label={t.common.prev}
              className="absolute start-2 top-[42%] z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100 active:scale-90 md:inline-flex"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={locale === 'ar' ? scrollPrev : scrollNext}
              aria-label={t.common.next}
              className="absolute end-2 top-[42%] z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-0 backdrop-blur transition hover:bg-black/70 group-hover:opacity-100 active:scale-90 md:inline-flex"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* نقاط الترقيم (قابلة للنقر) */}
        {total > 1 && (
          <div className="absolute inset-x-0 bottom-[4.5rem] z-10 flex items-center justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-label={`${i + 1}`}
                onClick={() => {
                  emblaApi?.scrollTo(i);
                  buzz('tick');
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index
                    ? 'w-5 bg-luxor-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                    : 'w-1.5 bg-white/45 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-4">
          <h3 className="font-black text-white text-xl leading-tight line-clamp-2">{title}</h3>
          <div className="flex items-center gap-3 mt-2 text-white/70 text-xs flex-wrap">
            {store?.name && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={12} className="text-luxor-goldlight" /> {store.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Sparkles size={12} className="text-luxor-goldlight" /> {count} {t.common.products}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openFullscreen}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-luxor-darkgold hover:text-luxor-obsidian transition"
        >
          <Maximize2 size={15} /> {t.common.openFullscreen}
        </button>
        <ShareButton
          variant="icon"
          path={`/catalog/${slug}?view=full`}
          title={title}
          text={title}
          label={t.common.shareCatalog}
        />
      </div>

      <CatalogLightbox
        open={open}
        slides={slides}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setOpen(false)}
        activeStore={activeStore}
        onNavigate={() => setOpen(false)}
      />
    </motion.div>
  );
}
