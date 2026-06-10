'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragDeltaX = useRef(0);

  if (!images?.length) {
    return (
      <div className="aspect-square rounded-2xl bg-luxor-sandlight flex items-center justify-center text-luxor-gold">
        <Package size={80} />
      </div>
    );
  }

  const total = images.length;
  const goTo = (i: number) => setActive((i + total) % total);
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  // Pointer events for mouse + touch swipe (single unified handler)
  const onPointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragDeltaX.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    dragDeltaX.current = e.clientX - dragStartX.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(calc(${-active * 100}% + ${dragDeltaX.current}px))`;
    }
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = dragDeltaX.current;
    dragDeltaX.current = 0;
    if (trackRef.current) {
      trackRef.current.style.transform = '';
    }
    const THRESHOLD = 60;
    if (delta > THRESHOLD) prev();
    else if (delta < -THRESHOLD) next();
  };

  // Keyboard arrow navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') next();
      else if (e.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, total]);

  return (
    <div>
      <div
        className="aspect-square relative rounded-2xl overflow-hidden bg-luxor-sandlight mb-3 touch-pan-y select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {/* Sliding track */}
        <div
          ref={trackRef}
          className="absolute inset-0 flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${-active * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={i} className="relative w-full h-full flex-shrink-0">
              <Image
                src={img}
                alt={`${title}-${i}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover pointer-events-none"
                priority={i === 0}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Prev / Next buttons */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="السابق"
              className="absolute top-1/2 -translate-y-1/2 start-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10"
            >
              <ChevronRight size={22} className="rtl:hidden" />
              <ChevronLeft size={22} className="ltr:hidden" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="التالي"
              className="absolute top-1/2 -translate-y-1/2 end-2 w-10 h-10 rounded-full bg-white/85 hover:bg-white shadow-md text-luxor-navy flex items-center justify-center z-10"
            >
              <ChevronLeft size={22} className="rtl:hidden" />
              <ChevronRight size={22} className="ltr:hidden" />
            </button>

            {/* Indicator dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`صورة ${i + 1}`}
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
              <Image src={img} alt={`${title}-thumb-${i}`} fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
