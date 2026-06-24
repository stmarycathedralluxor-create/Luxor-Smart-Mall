'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

import CatalogCard from './CatalogCard';
import { useLocale } from './LocaleProvider';
import type { ProductWithStore, Store } from '@/lib/types';

export type HomeCatalogCard = {
  id: string;
  title: string;
  slug: string;
  count: number;
  products: ProductWithStore[];
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
};

/**
 * CatalogsCarousel — قطار أفقي للكتالوجات في الصفحة الرئيسية مبني على
 * Embla Carousel:
 *  • تمرير انسيابي مع snap محكم (smooth snap scrolling).
 *  • سحب باللمس + أزرار تنقل ذهبية دائرية.
 *  • اتجاه RTL/LTR تلقائي حسب اللغة، وكروت كبيرة بنسبة 3:4 عبر CatalogCard.
 */
export default function CatalogsCarousel({ catalogs }: { catalogs: HomeCatalogCard[] }) {
  const { locale } = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const showNav = catalogs.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: dir,
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    skipSnaps: false,
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
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

  // أعِد التهيئة عند تغيير الاتجاه ليصحّ حساب RTL.
  useEffect(() => {
    emblaApi?.reInit({ direction: dir });
  }, [dir, emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="lsm-cat-carousel relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 sm:gap-5 lg:gap-6 py-2">
          {catalogs.map((c) => (
            <div
              key={c.id}
              className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_46%] lg:flex-[0_0_31%]"
            >
              <CatalogCard
                title={c.title}
                slug={c.slug}
                products={c.products}
                count={c.count}
                store={c.store ?? null}
              />
            </div>
          ))}
        </div>
      </div>

      {showNav && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canPrev}
            aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
            className="lsm-hc-btn absolute -top-[3.25rem] end-11 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-luxor-gold/40 bg-white text-luxor-darkgold shadow-sm transition hover:bg-luxor-gold hover:text-luxor-obsidian disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-luxor-darkgold sm:inline-flex"
          >
            {locale === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button
            type="button"
            onClick={scrollNext}
            disabled={!canNext}
            aria-label={locale === 'ar' ? 'التالي' : 'Next'}
            className="lsm-hc-btn absolute -top-[3.25rem] end-0 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-luxor-gold/40 bg-white text-luxor-darkgold shadow-sm transition hover:bg-luxor-gold hover:text-luxor-obsidian disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-luxor-darkgold sm:inline-flex"
          >
            {locale === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </>
      )}
    </div>
  );
}
