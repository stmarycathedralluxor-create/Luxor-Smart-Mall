'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, BookOpen, Store as StoreIcon, Sparkles, Maximize2 } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation, Pagination, Keyboard, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { buildCatalogSlides } from '@/components/MagazineFlipbook';
import CatalogLightbox from '@/components/CatalogLightbox';
import { useLocale } from './LocaleProvider';
import { useHaptics } from '@/lib/haptics';
import type { ProductWithStore, Store } from '@/lib/types';
import type { HomeCatalogCard } from './CatalogsCarousel';

/**
 * CatalogsCoverflow — كاروسيل ملء الشاشة بنمط Coverflow (مثل عارض الأفلام):
 *
 *  • الكارت الأوسط كبير وواضح، والكروت الجانبية مصغّرة ومعتّمة خلفه.
 *  • أسهم تنقّل على الحوافّ ونقاط ترقيم بالأسفل.
 *  • الضغط على الكارت الأوسط يفتح عارض الكتالوج بملء الشاشة.
 */
export default function CatalogsCoverflow({ catalogs }: { catalogs: HomeCatalogCard[] }) {
  const { locale } = useLocale();
  const buzz = useHaptics();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  // العنصر الذي يُعرض حالياً في العارض بملء الشاشة.
  const [openFor, setOpenFor] = useState<HomeCatalogCard | null>(null);
  const [fsIndex, setFsIndex] = useState(0);

  const openSlides = useMemo(
    () => (openFor ? buildCatalogSlides(openFor.products) : []),
    [openFor],
  );
  const activeStore =
    openSlides[fsIndex]?.product?.store ?? openFor?.store ?? null;

  if (!catalogs.length) return null;

  const openFullscreen = (c: HomeCatalogCard) => {
    setFsIndex(0);
    setOpenFor(c);
    buzz('medium');
  };

  return (
    <div className="lsm-cf relative w-full" dir={dir}>
      <Swiper
        modules={[EffectCoverflow, Navigation, Pagination, Keyboard, A11y]}
        dir={dir}
        key={dir}
        effect="coverflow"
        grabCursor
        centeredSlides
        loop={catalogs.length > 2}
        slidesPerView="auto"
        keyboard={{ enabled: true }}
        coverflowEffect={{
          rotate: 0,
          stretch: 0,
          depth: 220,
          modifier: 1.4,
          scale: 0.82,
          slideShadows: false,
        }}
        navigation={{ prevEl: '.lsm-cf-prev', nextEl: '.lsm-cf-next' }}
        pagination={{ el: '.lsm-cf-dots', clickable: true }}
        className="lsm-cf-swiper !px-4 !py-6"
      >
        {catalogs.map((c) => {
          const cover = c.products?.[0]?.images?.[0] ?? null;
          return (
            <SwiperSlide key={c.id} className="lsm-cf-slide">
              <button
                type="button"
                onClick={() => openFullscreen(c)}
                aria-label={
                  locale === 'ar'
                    ? `افتح كتالوج ${c.title} بملء الشاشة`
                    : `Open ${c.title} catalog fullscreen`
                }
                className="lsm-cf-card group relative block w-full overflow-hidden rounded-2xl bg-luxor-obsidian text-start shadow-2xl"
              >
                <div className="relative aspect-[16/10] w-full">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={c.title}
                      fill
                      sizes="(max-width:768px) 90vw, 60vw"
                      className="object-cover"
                      priority={false}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <BookOpen size={64} />
                    </div>
                  )}

                  {/* تعتيم الكروت الجانبية يُدار بالـ CSS عبر .swiper-slide-active */}
                  <div className="lsm-cf-dim pointer-events-none absolute inset-0 bg-black/55 transition-opacity duration-500" />

                  {/* تدرّج سفلي لوضوح النص */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* شارة ملء الشاشة (تظهر على الكارت النشط فقط) */}
                  <span className="lsm-cf-fs pointer-events-none absolute end-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                    <Maximize2 size={13} />
                    {locale === 'ar' ? 'ملء الشاشة' : 'Fullscreen'}
                  </span>

                  {/* العنوان + الوصف */}
                  <div className="lsm-cf-meta pointer-events-none absolute inset-x-0 bottom-0 z-10 p-5">
                    <h3 className="font-black leading-tight text-white text-lg sm:text-2xl line-clamp-1">
                      {c.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-white/75 text-xs sm:text-sm">
                      {c.store?.name && (
                        <span className="inline-flex items-center gap-1">
                          <StoreIcon size={13} className="text-luxor-goldlight" />
                          {c.store.name}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Sparkles size={13} className="text-luxor-goldlight" />
                        {c.count} {locale === 'ar' ? 'منتج' : 'items'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* أسهم التنقّل على الحوافّ */}
      <button
        type="button"
        aria-label={locale === 'ar' ? 'التالي' : 'Previous'}
        className="lsm-cf-prev lsm-cf-arrow absolute start-2 sm:start-4 top-1/2 z-30 -translate-y-1/2"
      >
        {dir === 'rtl' ? <ChevronRight size={34} /> : <ChevronLeft size={34} />}
      </button>
      <button
        type="button"
        aria-label={locale === 'ar' ? 'السابق' : 'Next'}
        className="lsm-cf-next lsm-cf-arrow absolute end-2 sm:end-4 top-1/2 z-30 -translate-y-1/2"
      >
        {dir === 'rtl' ? <ChevronLeft size={34} /> : <ChevronRight size={34} />}
      </button>

      {/* نقاط الترقيم */}
      <div className="lsm-cf-dots mt-4 flex items-center justify-center gap-1.5" />

      {/* العارض بملء الشاشة */}
      <CatalogLightbox
        open={!!openFor}
        slides={openSlides}
        index={fsIndex}
        onIndexChange={setFsIndex}
        onClose={() => setOpenFor(null)}
        activeStore={activeStore as Pick<Store, 'name' | 'slug' | 'logo_url'> | null}
        onNavigate={() => setOpenFor(null)}
      />
    </div>
  );
}
