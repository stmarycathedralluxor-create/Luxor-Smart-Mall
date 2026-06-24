'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Sparkles, Store as StoreIcon, Maximize2,
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
 *  • Embla Carousel → معاينة تلقائية ناعمة (صورة واحدة لكل منتج) مع snap محكم
 *    وسحب طبيعي باللمس.
 *  • Motion (Framer) → تكبير/ضغط لطيف عند التفاعل.
 *  • <img> أصلية مع loading كسول → تحميل صور موثوق وسريع من الـ CDN مباشرةً.
 *
 *  مزامنة كاملة مع العارض بملء الشاشة (CatalogLightbox):
 *  الفهرس الحالي في الكارت (cardIndex) هو نفسه فهرس العارض، فالضغط يفتح
 *  العارض على نفس الصورة، وإغلاق العارض يُرجِع الكارت إلى الصورة الأخيرة
 *  التي شاهدها المستخدم.
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
  const slides = useMemo(() => buildCatalogSlides(products), [products]);
  const total = slides.length;
  const buzz = useHaptics();
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  // فهرس مشترك بين الكارت والعارض بملء الشاشة (مصدر الحقيقة الواحد للمزامنة).
  const [index, setIndex] = useState(0);

  // Embla: تمرير حر + snap + تشغيل تلقائي يتوقّف عند فتح العارض/مرور الماوس.
  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 2600,
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

  // عند إغلاق العارض: أوقف autoplay أثناء فتحه، وأعِد الكارت لنفس الصورة.
  useEffect(() => {
    const ap = emblaApi?.plugins?.()?.autoplay as
      | { play: () => void; stop: () => void }
      | undefined;
    if (open) {
      ap?.stop();
    } else {
      // مزامنة: حرّك الكارت إلى الفهرس الذي انتهى عنده العارض.
      if (emblaApi && emblaApi.selectedScrollSnap() !== index) {
        emblaApi.scrollTo(index, true);
      }
      ap?.play();
    }
  }, [open, emblaApi, index]);

  if (!total) return null;

  const openFullscreen = () => {
    setOpen(true);
    buzz('medium');
  };

  // متجر المنتج المعروض حالياً في العارض (للّوجو أعلى).
  const activeStore = slides[index]?.product?.store ?? store ?? null;

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { scale: 1.02, y: -4 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className="group relative flex flex-col rounded-3xl bg-white border border-luxor-gold/20 shadow-[0_8px_30px_-12px_rgba(10,10,10,0.25)] hover:shadow-[0_24px_60px_-18px_rgba(212,175,55,0.45)] hover:border-luxor-gold/50 transition-shadow duration-300"
    >
      {/* الكارت الكبير 3:4 — الضغط يفتح العارض من نفس الصورة */}
      <button
        type="button"
        onClick={openFullscreen}
        aria-label={`${title} — ${t.common.openFullscreen}`}
        className="block w-full text-start"
      >
        <div className="relative m-2 mb-0 aspect-[3/4] overflow-hidden rounded-2xl bg-luxor-obsidian">
          {/* Embla viewport */}
          <div className="lsm-embla h-full w-full overflow-hidden" ref={emblaRef}>
            <div className="lsm-embla__container flex h-full">
              {slides.map(({ key, img, product }, i) => (
                <div
                  key={key}
                  className="lsm-embla__slide relative h-full min-w-0 flex-[0_0_100%]"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={product.title}
                      className="h-full w-full select-none object-cover"
                      draggable={false}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
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

          {/* نقاط الترقيم (Embla) */}
          {total > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-10 flex items-center justify-center gap-1.5">
              {slides.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index
                      ? 'w-5 bg-luxor-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                      : 'w-1.5 bg-white/45'
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
      </button>

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
