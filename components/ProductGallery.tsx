'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Package, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
// Swiper — main gallery + synced thumbnails + pinch/double-tap zoom lightbox.
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, Thumbs, Zoom, FreeMode, A11y } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper/types';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import 'swiper/css/zoom';
import { useLocale } from './LocaleProvider';
import CroppedImage from './CroppedImage';
import type { ImageCrop } from '@/lib/types';

export default function ProductGallery({
  images,
  imagesFull,
  imagesMeta,
  title,
}: {
  images: string[];
  /** الصور الأصلية كاملة الأبعاد — للمنتجات القديمة فقط (نظام الملفين) */
  imagesFull?: string[];
  /** بيانات القص المحفوظة — تُطبّق على الصورة الأصلية الوحيدة عند العرض */
  imagesMeta?: (ImageCrop | null)[];
  title: string;
}) {
  const { locale } = useLocale();
  const isRtl = locale === 'ar';

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);
  const mainRef = useRef<SwiperClass | null>(null);
  const didDrag = useRef(false);

  // React to color swatch clicks on the product page: jump to the image
  // linked to the selected color (fired by <ProductVariants/>).
  useEffect(() => {
    const onShowImage = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (!url) return;
      const idx = images.indexOf(url);
      if (idx >= 0) mainRef.current?.slideTo(idx);
    };
    window.addEventListener('lsm:show-product-image', onShowImage);
    return () => window.removeEventListener('lsm:show-product-image', onShowImage);
  }, [images]);

  // Lock body scroll + Esc-to-close while lightbox is open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen]);

  if (!images?.length) {
    return (
      <div className="aspect-square rounded-2xl bg-luxor-sandlight flex items-center justify-center text-luxor-gold">
        <Package size={80} />
      </div>
    );
  }

  const total = images.length;

  const openLightbox = () => {
    // Suppress the click that follows a swipe so dragging doesn't open the modal.
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setLightboxOpen(true);
  };

  return (
    <div className="lsm-gallery">
      {/* Main image carousel */}
      <div className="relative rounded-2xl overflow-hidden bg-luxor-sandlight mb-3 group">
        <Swiper
          onSwiper={(sw) => {
            mainRef.current = sw;
          }}
          modules={[Navigation, Pagination, Keyboard, Thumbs, A11y]}
          dir={isRtl ? 'rtl' : 'ltr'}
          slidesPerView={1}
          spaceBetween={0}
          speed={400}
          grabCursor
          keyboard={{ enabled: true }}
          navigation={{ nextEl: '.lsm-g-next', prevEl: '.lsm-g-prev' }}
          pagination={{ el: '.lsm-g-pagination', clickable: true, dynamicBullets: true }}
          thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : undefined }}
          onSlideChange={(sw) => setActive(sw.activeIndex)}
          onTouchStart={() => {
            didDrag.current = false;
          }}
          onTouchMove={() => {
            didDrag.current = true;
          }}
        >
          {images.map((img, i) => (
            <SwiperSlide key={i}>
              <div
                className="aspect-square relative cursor-zoom-in select-none"
                onClick={openLightbox}
                role="button"
                tabIndex={0}
                aria-label={isRtl ? 'اضغط لعرض الصورة بحجمها الكامل' : 'Tap to view full size'}
              >
                <CroppedImage
                  src={img}
                  crop={imagesMeta?.[i]}
                  alt={`${title}-${i}`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  imgClassName="pointer-events-none"
                  priority={i === 0}
                  draggable={false}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Zoom hint */}
        <div className="absolute bottom-3 end-3 bg-black/55 text-white text-xs font-medium px-2 py-1.5 rounded-full z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
          <ZoomIn size={14} />
          {isRtl ? 'تكبير' : 'Zoom'}
        </div>

        {total > 1 && (
          <>
            {/* Prev (start side) */}
            <button
              type="button"
              aria-label={isRtl ? 'السابق' : 'Previous'}
              className="lsm-g-prev absolute top-1/2 -translate-y-1/2 start-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10 disabled:opacity-0 transition"
            >
              {isRtl ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
            </button>
            {/* Next (end side) */}
            <button
              type="button"
              aria-label={isRtl ? 'التالي' : 'Next'}
              className="lsm-g-next absolute top-1/2 -translate-y-1/2 end-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10 disabled:opacity-0 transition"
            >
              {isRtl ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
            </button>

            {/* Pagination + counter */}
            <div className="lsm-g-pagination absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center" />
            <div className="absolute top-3 end-3 bg-black/55 text-white text-xs font-medium px-2 py-1 rounded-full z-10" dir="ltr">
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails (synced via Swiper Thumbs) */}
      {total > 1 && (
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Thumbs, FreeMode, A11y]}
          dir={isRtl ? 'rtl' : 'ltr'}
          watchSlidesProgress
          slidesPerView={5}
          spaceBetween={8}
          freeMode
          className="lsm-gallery-thumbs"
        >
          {images.map((img, i) => (
            <SwiperSlide key={i}>
              <div className="aspect-square relative rounded-lg overflow-hidden border-2 border-transparent opacity-70 transition cursor-pointer">
                <CroppedImage src={img} crop={imagesMeta?.[i]} alt={`${title}-thumb-${i}`} sizes="20vw" />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      )}

      {/* Full-size lightbox modal — Swiper with pinch/double-tap Zoom */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 z-20 pointer-events-none">
            {total > 1 ? (
              <div className="bg-black/55 backdrop-blur text-white text-sm font-semibold px-3 py-1.5 rounded-full pointer-events-auto shadow" dir="ltr">
                {active + 1} / {total}
              </div>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={isRtl ? 'إغلاق' : 'Close'}
              className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition pointer-events-auto shadow"
            >
              <X size={24} />
            </button>
          </div>

          <Swiper
            modules={[Navigation, Keyboard, Zoom, A11y]}
            dir={isRtl ? 'rtl' : 'ltr'}
            initialSlide={active}
            slidesPerView={1}
            spaceBetween={24}
            speed={400}
            keyboard={{ enabled: true }}
            zoom={{ maxRatio: 4, toggle: true }}
            navigation={{ nextEl: '.lsm-lb-next', prevEl: '.lsm-lb-prev' }}
            onSlideChange={(sw) => setActive(sw.activeIndex)}
            className="w-full h-full"
          >
            {images.map((img, i) => (
              <SwiperSlide key={i} className="flex items-center justify-center">
                <div className="swiper-zoom-container w-full h-full flex items-center justify-center p-3 sm:p-10">
                  <Image
                    src={imagesFull?.[i] || images[i]}
                    alt={`${title}-${i}`}
                    width={1600}
                    height={1600}
                    sizes="100vw"
                    className="object-contain max-w-full max-h-[88vh] w-auto h-auto rounded-2xl"
                    priority={i === active}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label={isRtl ? 'السابق' : 'Previous'}
                className="lsm-lb-prev absolute top-1/2 -translate-y-1/2 start-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center z-30 transition"
              >
                {isRtl ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
              </button>
              <button
                type="button"
                aria-label={isRtl ? 'التالي' : 'Next'}
                className="lsm-lb-next absolute top-1/2 -translate-y-1/2 end-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center z-30 transition"
              >
                {isRtl ? <ChevronLeft size={26} /> : <ChevronRight size={26} />}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
