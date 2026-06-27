'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Store as StoreIcon } from 'lucide-react';
import CroppedImage from './CroppedImage';
import type { ImageCrop } from '@/lib/types';

/**
 * ProductCardGallery — معرض صور قابل للسحب داخل كارت المنتج.
 * • صورة واحدة → عرض ثابت بدون أي عناصر تنقل.
 * • أكثر من صورة → سحب أفقي (touch / mouse) مع نقاط مؤشّر سفلية.
 *
 * نتعمّد عدم استخدام Swiper هنا حتى يبقى الكارت خفيفاً جداً (آلاف الكروت)،
 * ونعتمد على scroll-snap الأصلي للمتصفّح وهو سلس على iOS/Android.
 */
export default function ProductCardGallery({
  images,
  meta,
  alt,
  href,
  available,
  unavailableLabel,
}: {
  images: string[];
  meta?: (ImageCrop | null)[];
  alt: string;
  href: string;
  available: boolean;
  unavailableLabel: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // نميّز السحب عن النقر حتى لا يفتح المنتج عند مجرّد التمرير بين الصور
  const dragState = useRef<{ x: number; moved: boolean }>({ x: 0, moved: false });

  const valid = images.filter(Boolean);
  const multi = valid.length > 1;

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== active) setActive(Math.abs(i));
  };

  return (
    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-black">
      {valid.length === 0 ? (
        <Link href={href} className="flex h-full w-full items-center justify-center text-luxor-gold/40">
          <StoreIcon size={48} />
        </Link>
      ) : (
        <div
          ref={scrollerRef}
          onScroll={multi ? onScroll : undefined}
          className={`flex h-full w-full ${
            multi
              ? 'snap-x snap-mandatory overflow-x-auto scroll-smooth no-scrollbar'
              : 'overflow-hidden'
          }`}
        >
          {valid.map((img, i) => (
            <Link
              key={i}
              href={href}
              draggable={false}
              onPointerDown={(e) => {
                dragState.current = { x: e.clientX, moved: false };
              }}
              onPointerMove={(e) => {
                if (Math.abs(e.clientX - dragState.current.x) > 8) dragState.current.moved = true;
              }}
              onClick={(e) => {
                // إذا كان المستخدم يسحب بين الصور لا نفتح صفحة المنتج
                if (dragState.current.moved) {
                  e.preventDefault();
                }
              }}
              className="relative block h-full w-full shrink-0 grow-0 basis-full snap-center"
            >
              <span className="absolute inset-0 block transition-transform duration-700 ease-out group-hover:scale-105">
                <CroppedImage
                  src={img}
                  crop={meta?.[i] ?? null}
                  alt={`${alt} ${i + 1}`}
                  sizes="(max-width: 640px) 50vw, 25vw"
                />
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* خط ذهبي رفيع أسفل الصورة */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />

      {/* مؤشّر عدد الصور (نقاط) */}
      {multi && (
        <div className="pointer-events-none absolute bottom-2 inset-x-0 flex items-center justify-center gap-1">
          {valid.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-4 bg-luxor-gold' : 'w-1.5 bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      {/* شارة عدد الصور أعلى الزاوية */}
      {multi && (
        <span className="pointer-events-none absolute top-2 end-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm" dir="ltr">
          1 / {valid.length}
        </span>
      )}

      {!available && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-red-600 shadow">
            {unavailableLabel}
          </span>
        </div>
      )}
    </div>
  );
}
