'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  BookOpen, Sparkles, Store as StoreIcon, Maximize2,
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import { buildCatalogSlides } from '@/components/MagazineFlipbook';
import CatalogLightbox from '@/components/CatalogLightbox';
import ShareButton from '@/components/ShareButton';
import { useHaptics } from '@/lib/haptics';
import type { ProductWithStore, Store } from '@/lib/types';

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * CatalogCard — كارت كتالوج تفاعلي في صفحة الكتالوجات الرئيسية:
 *
 *  • يعرض صور المنتجات (صورة واحدة لكل منتج) ويتحرّك لوحده تلقائياً مع تكبير
 *    لطيف بطيء (Ken Burns) ليبدو حيّاً.
 *  • الضغط عليه يفتح عارض كتالوج بملء الشاشة (CatalogLightbox) — سحب طبيعي
 *    وسلس، تكبير، شريط مصغّرات — بدءاً من نفس الصورة المعروضة.
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

  const [open, setOpen] = useState(false);
  // عدّاد الكارت المتحرّك تلقائياً (الـ autoplay).
  const [cardIndex, setCardIndex] = useState(0);
  // الفهرس داخل العارض بملء الشاشة.
  const [fsIndex, setFsIndex] = useState(0);

  if (!total) return null;

  const openFullscreen = () => {
    setFsIndex(cardIndex);
    setOpen(true);
    buzz('medium');
  };

  // متجر المنتج المعروض حالياً في العارض (للّوجو أعلى اليسار).
  const activeStore = slides[fsIndex]?.product?.store ?? store ?? null;

  return (
    <div className="group relative bg-white rounded-3xl overflow-hidden border border-luxor-gold/20 shadow-sm hover:shadow-luxor-lg hover:border-luxor-gold/50 transition-all">
      {/* الكارت المتحرّك لوحده — الضغط عليه يفتح العارض من نفس الصورة */}
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
              effect="slide"
              slidesPerView={1}
              spaceBetween={0}
              speed={560}
              loop={total > 1}
              // الكارت قابل للسحب يدوياً أيضاً.
              allowTouchMove
              grabCursor
              threshold={4}
              touchRatio={1.2}
              resistance
              resistanceRatio={0.7}
              followFinger
              shortSwipes
              longSwipesRatio={0.2}
              autoplay={
                total > 1 && !open
                  ? { delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true }
                  : false
              }
              onSlideChange={(sw) => setCardIndex(sw.realIndex)}
              className="lsm-cat-swiper h-full"
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
                        // تُعرض الصورة كاملةً مع احترام نسبتها الأصلية — بلا قصّ.
                        className="object-contain"
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

      <CatalogLightbox
        open={open}
        slides={slides}
        index={fsIndex}
        onIndexChange={setFsIndex}
        onClose={() => setOpen(false)}
        activeStore={activeStore}
        onNavigate={() => setOpen(false)}
      />
    </div>
  );
}
