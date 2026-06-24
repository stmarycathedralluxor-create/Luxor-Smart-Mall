'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BookOpen, Sparkles, Store as StoreIcon, Maximize2,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import { buildCatalogSlides } from '@/components/MagazineFlipbook';
import CatalogLightbox from '@/components/CatalogLightbox';
import ShareButton from '@/components/ShareButton';
import { useLocale } from '@/components/LocaleProvider';
import { useHaptics } from '@/lib/haptics';
import type { ProductWithStore, Store } from '@/lib/types';

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * CatalogCard — كارت كتالوج كبير (نسبة 3:4) في صفحة الكتالوجات والرئيسية.
 *
 * أُعيد بناؤه بـ:
 *  • Embla Carousel  → تمرير تلقائي ناعم بين صور المنتجات (صورة واحدة لكل منتج)
 *    مع snap محكم وسحب يدوي طبيعي.
 *  • Motion (Framer) → تكبير لطيف عند المرور (scale-on-hover) وإحساس "press".
 *  • Tailwind        → كارت كبير بنسبة 3:4، ظلال ناعمة، حواف مستديرة.
 *
 * الضغط عليه يفتح عارض كتالوج بملء الشاشة (CatalogLightbox) من نفس الصورة.
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
  // الفهرس الحالي داخل كاروسيل الكارت (للمزامنة مع العارض بملء الشاشة).
  const [cardIndex, setCardIndex] = useState(0);
  const [fsIndex, setFsIndex] = useState(0);

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

  const onSelect = useCallback(() => {
    if (emblaApi) setCardIndex(emblaApi.selectedScrollSnap());
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

  // أوقِف التشغيل التلقائي عندما يكون العارض بملء الشاشة مفتوحاً.
  useEffect(() => {
    const ap = emblaApi?.plugins?.()?.autoplay as
      | { play: () => void; stop: () => void }
      | undefined;
    if (!ap) return;
    if (open) ap.stop();
    else ap.play();
  }, [open, emblaApi]);

  if (!total) return null;

  const openFullscreen = () => {
    setFsIndex(cardIndex);
    setOpen(true);
    buzz('medium');
  };

  // متجر المنتج المعروض حالياً في العارض (للّوجو أعلى اليسار).
  const activeStore = slides[fsIndex]?.product?.store ?? store ?? null;

  return (
    <motion.div
      // تكبير لطيف للكارت كاملاً عند المرور + إحساس ضغط — ظلال ناعمة.
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
                    <motion.div
                      className="relative h-full w-full"
                      // تكبير بطيء ناعم على الصورة عند المرور (Ken-Burns خفيف)
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Image
                        src={img}
                        alt={product.title}
                        fill
                        sizes="(max-width:640px) 80vw, (max-width:1024px) 45vw, 30vw"
                        className="select-none object-cover"
                        draggable={false}
                        priority={i === 0}
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

          {/* نقاط الترقيم (Embla) */}
          {total > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] z-10 flex items-center justify-center gap-1.5">
              {slides.map((s, i) => (
                <span
                  key={s.key}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === cardIndex
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
        index={fsIndex}
        onIndexChange={setFsIndex}
        onClose={() => setOpen(false)}
        activeStore={activeStore}
        onNavigate={() => setOpen(false)}
      />
    </motion.div>
  );
}
