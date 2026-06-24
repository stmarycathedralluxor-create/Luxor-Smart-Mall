'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  Store as StoreIcon,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';

import { useLocale } from '@/components/LocaleProvider';
import { useHaptics } from '@/lib/haptics';
import { cdnImage } from '@/lib/utils';
import type { CatalogSlide, CardStore } from '@/lib/catalog';

/**
 * CatalogLightbox — عارض كتالوج بملء الشاشة، Mobile-First، مبني بالكامل على:
 *
 *  • Embla Carousel → سحب طبيعي لحظي يتبع الإصبع، snap محكم، حلقي (loop)،
 *    ولمسة هابتِك عند تغيّر الشريحة. لا Swiper إطلاقاً.
 *  • Motion (Framer) → دخول/خروج العارض بتلاشٍ وتحجيم ناعم، وسحب لأسفل
 *    لإغلاق العرض (drag-to-dismiss) بإحساس تطبيقات الصور الأصلية.
 *  • <img> أصلية (loading=eager للشرائح المجاورة) → الصور تظهر فوراً وبثبات
 *    من الـ CDN مباشرةً، دون أي طبقة تحسين قد تُبطئ أو تمنع ظهورها.
 *
 *  مزامنة كاملة: الفهرس يُتحكَّم به من الخارج عبر `index` و`onIndexChange`،
 *  فيبقى الكارت الصغير والعارض الكبير على نفس الصورة دائماً.
 */
export default function CatalogLightbox({
  open,
  slides,
  index,
  onIndexChange,
  onClose,
  activeStore,
  onNavigate,
}: {
  open: boolean;
  slides: CatalogSlide[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** متجر المنتج المعروض حالياً (للّوجو أعلى). */
  activeStore?: CardStore;
  /** يُستدعى قبل التنقّل لصفحة (متجر/منتج) — لإغلاق العرض. */
  onNavigate?: () => void;
}) {
  const { t } = useLocale();
  const buzz = useHaptics();
  const reduceMotion = useReducedMotion();
  const items = slides.filter((s) => !!s.img);
  const total = items.length;

  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(index);

  // العارض LTR ثابت دائماً → اتجاه السحب والأزرار متطابق في كل اللغات.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: 'ltr',
    loop: total > 1,
    align: 'center',
    containScroll: false,
    dragFree: false,
    duration: 22,
  });

  // التركيب على العميل فقط (Portal لجسم الصفحة).
  useEffect(() => setMounted(true), []);

  // مزامنة الفهرس الوارد عند الفتح أو تغيّره من الخارج (مزامنة مع الكارت).
  useEffect(() => {
    if (!open) return;
    const clamped = Math.min(Math.max(0, index), Math.max(0, total - 1));
    setActive(clamped);
    if (emblaApi && emblaApi.selectedScrollSnap() !== clamped) {
      emblaApi.scrollTo(clamped, true);
    }
  }, [open, index, total, emblaApi]);

  // تتبّع الشريحة المختارة داخل Embla → يحدّث الفهرس الخارجي (مزامنة).
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const i = emblaApi.selectedScrollSnap();
    setActive(i);
    onIndexChange(i);
    buzz('tick');
  }, [emblaApi, onIndexChange, buzz]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // قفل تمرير الصفحة خلف العرض + تنقّل/إغلاق بلوحة المفاتيح.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') emblaApi?.scrollNext();
      else if (e.key === 'ArrowLeft') emblaApi?.scrollPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, emblaApi]);

  const goPrev = useCallback(() => {
    emblaApi?.scrollPrev();
    buzz('tick');
  }, [emblaApi, buzz]);
  const goNext = useCallback(() => {
    emblaApi?.scrollNext();
    buzz('tick');
  }, [emblaApi, buzz]);

  if (!mounted || !total) return null;

  const current = items[Math.min(active, total - 1)];
  const showStore = activeStore?.slug ? activeStore : current?.product?.store ?? null;
  const progress = total > 1 ? ((active + 1) / total) * 100 : 100;

  const view = (
    <AnimatePresence>
      {open && (
        <motion.div
          dir="ltr"
          className="lsm-cf fixed inset-0 z-[120] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={t.common.fullscreen}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* خلفية داكنة فاخرة + إغلاق بالنقر عليها */}
          <button
            type="button"
            aria-label={t.common.close}
            onClick={onClose}
            className="lsm-cf-backdrop absolute inset-0 -z-10"
            tabIndex={-1}
          />

          {/* الرأس: لوجو المتجر + عدّاد + زر إغلاق */}
          <div className="relative z-10 flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            {showStore?.slug ? (
              <Link
                href={`/stores/${showStore.slug}`}
                onClick={onNavigate}
                aria-label={showStore.name ?? ''}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pr-3 pl-1.5 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
                  {showStore.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cdnImage(showStore.logo_url, 96)}
                      alt={showStore.name ?? ''}
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <StoreIcon size={16} className="text-luxor-goldlight" />
                  )}
                </span>
                {showStore.name && (
                  <span className="max-w-[40vw] truncate text-xs font-bold">{showStore.name}</span>
                )}
              </Link>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums text-white/85 backdrop-blur">
                {active + 1} / {total}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t.common.close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* الكاروسيل (Embla) — سحب أفقي للتنقّل بين الصور فقط.
              لا سحب لأسفل للإغلاق (drag-to-dismiss مُعطَّل بناءً على الطلب):
              الإغلاق يتم عبر زر X أو النقر على الخلفية أو مفتاح Escape. */}
          <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-1 pb-1">
            <div className="lsm-cf-embla h-full w-full overflow-hidden" ref={emblaRef}>
              <div className="lsm-cf-embla__container flex h-full">
                {items.map(({ key, img, product }, i) => (
                  <div
                    key={key}
                    className="lsm-cf-embla__slide flex h-full min-w-0 flex-[0_0_100%] items-center justify-center p-1"
                  >
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cdnImage(img, 1400, 82)}
                        alt={product.title}
                        className="lsm-cf-img"
                        draggable={false}
                        loading={Math.abs(i - active) <= 1 ? 'eager' : 'lazy'}
                        // @ts-expect-error fetchpriority is a valid html attr
                        fetchpriority={i === active ? 'high' : 'auto'}
                        decoding="async"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* أزرار التنقّل: يسار = السابق، يمين = التالي (ثابت في كل اللغات) */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  aria-label={t.common.prev}
                  onClick={goPrev}
                  className="lsm-cf-nav absolute left-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-90 md:left-6"
                >
                  <ChevronLeft size={26} />
                </button>
                <button
                  type="button"
                  aria-label={t.common.next}
                  onClick={goNext}
                  className="lsm-cf-nav absolute right-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-90 md:right-6"
                >
                  <ChevronRight size={26} />
                </button>
              </>
            )}
          </div>

          {/* العنوان + زر «عرض المنتج» + شريط تقدّم رفيع */}
          <div className="relative z-10 flex flex-col items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {current && (
              <motion.div
                key={current.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex w-full max-w-md flex-col items-center gap-2 text-center"
              >
                <h3 className="line-clamp-1 text-base font-bold text-white drop-shadow">
                  {current.product.title}
                </h3>
                <Link
                  href={`/products/${current.product.id}`}
                  onClick={onNavigate}
                  className="inline-flex items-center gap-1.5 rounded-full bg-luxor-gold px-5 py-2.5 text-sm font-bold text-luxor-obsidian shadow-lg transition hover:bg-luxor-goldlight active:scale-95"
                >
                  <ExternalLink size={16} /> {t.common.viewProduct}
                </Link>
              </motion.div>
            )}

            {total > 1 && (
              <div
                className="lsm-cf-progress h-1 w-full max-w-[70vw] overflow-hidden rounded-full bg-white/15"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={total}
                aria-valuenow={active + 1}
              >
                <span
                  className="block h-full rounded-full bg-luxor-gold transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(view, document.body);
}
