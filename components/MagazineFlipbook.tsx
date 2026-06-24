'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2, Store as StoreIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

import CatalogLightbox from '@/components/CatalogLightbox';
import { buildCatalogSlides } from '@/lib/catalog';
import type { ProductWithStore, Store } from '@/lib/types';

// Re-export so existing imports from this module keep working.
export { buildCatalogSlides } from '@/lib/catalog';

/**
 * MagazineFlipbook — معاينة كتالوج صفحة التفاصيل، Mobile-First، مبنية على
 * Motion + Embla (لا Swiper):
 *
 *  • معاينة داخل الصفحة (Embla) تتحرّك تلقائياً، صورة واحدة لكل منتج.
 *  • الضغط/السحب يفتح عارضاً بملء الشاشة (CatalogLightbox) من نفس الصورة.
 *  • مزامنة كاملة: المعاينة والعارض يتشاركان فهرساً واحداً، فيبقيان على
 *    نفس الصورة عند الفتح والإغلاق.
 *  • وضع المشاركة (sharedFullView) يفتح العارض بملء الشاشة مباشرةً.
 */
export default function MagazineFlipbook({
  title,
  products,
  store,
  coverImage,
  autoPlayPreview = false,
  autoFullscreenFromUrl = false,
  sharedFullView = false,
}: {
  title: string;
  products: ProductWithStore[];
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
  coverImage?: string | null;
  autoPlayPreview?: boolean;
  autoFullscreenFromUrl?: boolean;
  sharedFullView?: boolean;
}) {
  void coverImage;
  void title;
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const slides = useMemo(() => buildCatalogSlides(products), [products]);
  const total = slides.length;

  const [open, setOpen] = useState(sharedFullView);
  // فهرس مشترك بين المعاينة والعارض (مصدر الحقيقة الواحد للمزامنة).
  const [index, setIndex] = useState(0);

  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 2600,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    []
  );
  const usePreview = !sharedFullView;
  const [emblaRef, emblaApi] = useEmblaCarousel(
    usePreview ? { loop: total > 1, align: 'center', containScroll: false } : { active: false },
    usePreview && autoPlayPreview && total > 1 ? [autoplay] : []
  );

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

  // أوقف autoplay أثناء فتح العارض، وأعِد المعاينة لنفس الصورة عند الإغلاق.
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

  // فتح ملء الشاشة تلقائياً عند رابط المشاركة (?view=full / ?fullscreen=1 / #full).
  useEffect(() => {
    if (!autoFullscreenFromUrl || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wantsFull =
      params.get('view') === 'full' ||
      params.get('fullscreen') === '1' ||
      window.location.hash === '#full';
    if (wantsFull) {
      setIndex(0);
      setOpen(true);
    }
  }, [autoFullscreenFromUrl]);

  if (!total) return null;

  const closeFullscreen = () => {
    if (sharedFullView) {
      const clean = typeof window !== 'undefined' ? window.location.pathname : '';
      if (clean) router.replace(clean);
    }
    setOpen(false);
  };

  const activeStore = slides[index]?.product?.store ?? store ?? null;

  const lightbox = (
    <CatalogLightbox
      open={open}
      slides={slides}
      index={index}
      onIndexChange={setIndex}
      onClose={closeFullscreen}
      activeStore={activeStore}
      onNavigate={() => setOpen(false)}
    />
  );

  // وضع المشاركة: العارض بملء الشاشة فقط منذ الفتح.
  if (sharedFullView) return lightbox;

  /* ─────────── معاينة داخل الصفحة (Embla) — الضغط يفتح ملء الشاشة ─────────── */
  return (
    <>
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="افتح الكتالوج بملء الشاشة"
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-black"
      >
        <div className="lsm-cat-embla overflow-hidden" ref={emblaRef}>
          <div className="lsm-cat-embla__container flex">
            {slides.map(({ key, img, product }) => (
              <div key={key} className="lsm-cat-embla__slide min-w-0 flex-[0_0_100%]">
                <div className="relative w-full aspect-square sm:aspect-[4/3]">
                  {img ? (
                    // صورة ضمن التدفّق (in-flow) بدل position:absolute حتى يرسمها
                    // WebKit على الجوال وهي خارج الشاشة (وإلا تظهر سوداء). كل
                    // الصور eager + decode() لضمان رسمها مسبقاً قبل التمرير.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={product.title}
                      className="lsm-cat-img"
                      draggable={false}
                      loading="eager"
                      decoding="async"
                      onLoad={(e) => {
                        const el = e.currentTarget;
                        if (typeof el.decode === 'function') {
                          el.decode().catch(() => {});
                        }
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <StoreIcon size={72} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* تلميح ملء الشاشة */}
        <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-black/75">
          <Maximize2 size={14} /> ملء الشاشة
        </span>

        {/* نقاط ترقيم */}
        {total > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1.5">
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
      </motion.button>

      {lightbox}
    </>
  );
}
