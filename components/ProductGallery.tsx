'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Package, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
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
  // Multiplier so positive translateX moves "next" in the visual reading order.
  // In LTR: next = move left (negative). In RTL: next = move right (positive).
  const dir = isRtl ? 1 : -1;

  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragDeltaX = useRef(0);
  const didDrag = useRef(false);

  if (!images?.length) {
    return (
      <div className="aspect-square rounded-2xl bg-luxor-sandlight flex items-center justify-center text-luxor-gold">
        <Package size={80} />
      </div>
    );
  }

  const total = images.length;
  const goTo = (i: number) => setActive((i + total) % total);
  // "next" advances forward in the user's reading order; "prev" goes back.
  const next = useCallback(() => setActive((a) => (a + 1) % total), [total]);
  const prev = useCallback(() => setActive((a) => (a - 1 + total) % total), [total]);

  // Pointer events for mouse + touch swipe (single unified handler)
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    didDrag.current = false;
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
    if (Math.abs(dragDeltaX.current) > 5) didDrag.current = true;
    if (trackRef.current) {
      // base offset uses `dir` so the active slide is correctly positioned in RTL/LTR.
      trackRef.current.style.transform = `translateX(calc(${dir * active * 100}% + ${dragDeltaX.current}px))`;
    }
  };

  const onPointerEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = dragDeltaX.current;
    dragDeltaX.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = '';
    }
    const THRESHOLD = 60;
    // Dragging finger to the right (positive delta):
    //   LTR -> reveals the previous slide (prev)
    //   RTL -> reveals the next slide (next)
    if (delta > THRESHOLD) {
      isRtl ? next() : prev();
    } else if (delta < -THRESHOLD) {
      isRtl ? prev() : next();
    }
  };

  // Keyboard arrow navigation: ArrowRight/ArrowLeft map to the user's reading order.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        isRtl ? prev() : next();
      } else if (e.key === 'ArrowLeft') {
        isRtl ? next() : prev();
      } else if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isRtl, next, prev]);

  // React to color swatch clicks on the product page: jump to the image
  // linked to the selected color (fired by <ProductVariants/>).
  useEffect(() => {
    const onShowImage = (e: Event) => {
      const url = (e as CustomEvent<{ url?: string }>).detail?.url;
      if (!url) return;
      const idx = images.indexOf(url);
      if (idx >= 0) setActive(idx);
    };
    window.addEventListener('lsm:show-product-image', onShowImage);
    return () => window.removeEventListener('lsm:show-product-image', onShowImage);
  }, [images]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [lightboxOpen]);

  const openLightbox = () => {
    // suppress click after a swipe so dragging doesn't open the modal
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    setLightboxOpen(true);
  };

  return (
    <div>
      <div
        className="aspect-square relative rounded-2xl overflow-hidden bg-luxor-sandlight mb-3 touch-pan-y select-none cursor-zoom-in group"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClick={openLightbox}
        role="button"
        tabIndex={0}
        aria-label={isRtl ? 'اضغط لعرض الصورة بحجمها الكامل' : 'Tap to view full size'}
      >
        {/* Sliding track */}
        <div
          ref={trackRef}
          className="absolute inset-0 flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${dir * active * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative w-full h-full flex-shrink-0 overflow-hidden">
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
          ))}
        </div>

        {/* Zoom hint */}
        <div className="absolute bottom-3 end-3 bg-black/55 text-white text-xs font-medium px-2 py-1.5 rounded-full z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition pointer-events-none">
          <ZoomIn size={14} />
          {isRtl ? 'تكبير' : 'Zoom'}
        </div>

        {/* Prev / Next buttons */}
        {total > 1 && (
          <>
            {/* Button on the "start" side = visual previous in user's reading order */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label={isRtl ? 'السابق' : 'Previous'}
              className="absolute top-1/2 -translate-y-1/2 start-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10"
            >
              {/* Chevron always points toward the "start" of the reading direction */}
              {isRtl ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
            </button>
            {/* Button on the "end" side = visual next */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label={isRtl ? 'التالي' : 'Next'}
              className="absolute top-1/2 -translate-y-1/2 end-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10"
            >
              {isRtl ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
            </button>

            {/* Indicator dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i);
                  }}
                  aria-label={`${isRtl ? 'صورة' : 'image'} ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    active === i ? 'w-6 bg-luxor-gold' : 'w-2 bg-white/70'
                  }`}
                />
              ))}
            </div>

            {/* Counter pill */}
            <div className="absolute top-3 end-3 bg-black/55 text-white text-xs font-medium px-2 py-1 rounded-full z-10" dir="ltr">
              {active + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {total > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`aspect-square relative rounded-lg overflow-hidden border-2 transition ${
                active === i ? 'border-luxor-gold' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <CroppedImage src={img} crop={imagesMeta?.[i]} alt={`${title}-thumb-${i}`} sizes="20vw" />
            </button>
          ))}
        </div>
      )}

      {/* Full-size lightbox modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-8 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Top bar — keeps the close button + counter from overlapping
              on narrow mobile screens by using a flex row across the top. */}
          <div
            className="absolute top-0 inset-x-0 flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 z-20 pointer-events-none"
          >
            {/* Counter on the start side */}
            {total > 1 ? (
              <div
                className="bg-black/55 backdrop-blur text-white text-sm font-semibold px-3 py-1.5 rounded-full pointer-events-auto shadow"
                dir="ltr"
              >
                {active + 1} / {total}
              </div>
            ) : (
              <span />
            )}

            {/* Close button on the end side */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              aria-label={isRtl ? 'إغلاق' : 'Close'}
              className="w-11 h-11 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition pointer-events-auto shadow"
            >
              <X size={24} />
            </button>
          </div>

          {/* Image container — the FULL ORIGINAL image (uncropped), contained */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[88vh] rounded-2xl overflow-hidden flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={imagesFull?.[active] || images[active]}
              alt={`${title}-${active}`}
              fill
              sizes="100vw"
              className="object-contain rounded-2xl"
              priority
            />
          </div>

          {/* Prev / Next in lightbox */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label={isRtl ? 'السابق' : 'Previous'}
                className="absolute top-1/2 -translate-y-1/2 start-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center z-10 transition"
              >
                {isRtl ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label={isRtl ? 'التالي' : 'Next'}
                className="absolute top-1/2 -translate-y-1/2 end-4 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center z-10 transition"
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
