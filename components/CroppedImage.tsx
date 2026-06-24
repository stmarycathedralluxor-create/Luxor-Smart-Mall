import Image from 'next/image';
import type { ImageCrop } from '@/lib/types';

/**
 * CroppedImage — يعرض الصورة الأصلية مع تطبيق بيانات القص المحفوظة
 * في قاعدة البيانات (متغيرات x/y/w/h كسرية) عن طريق CSS فقط.
 *
 * لا توجد صورة مقصوصة مخزّنة — ملف واحد فقط لكل صورة، وإعادة القص
 * تكون تحديث JSON بدون رفع أي ملف جديد.
 *
 * ملاحظة هندسية: محرر القص يفرض أن منطقة القص لها نفس نسبة أبعاد
 * إطار العرض (cover)، لذلك تمديد الصورة بنسب مئوية لا يسبب أي تشويه.
 */
// Tiny inline SVG blur used as a placeholder while the real image streams in.
// Prevents the blank/grey flash that feels especially slow on iOS Safari.
// Precomputed base64 (a single dark obsidian 8×8 rect) so this module stays
// safe in the browser bundle — no Node `Buffer` dependency at runtime.
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMxYzE5MTciLz48L3N2Zz4=';

export default function CroppedImage({
  src,
  crop,
  alt,
  sizes,
  priority = false,
  imgClassName = '',
  draggable,
}: {
  src: string;
  crop?: ImageCrop | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  /** classes تُطبق على عنصر الصورة عندما لا يوجد قص (مثل object-cover) وعلى الغلاف عند وجوده */
  imgClassName?: string;
  draggable?: boolean;
}) {
  const valid =
    crop && crop.w > 0 && crop.h > 0 && crop.w <= 1 && crop.h <= 1 && crop.x >= 0 && crop.y >= 0;

  // Performance defaults — critical for iOS / Safari where decoding many large
  // images synchronously blocks the main thread and delays first paint:
  //  • priority images load eagerly + high fetchPriority (above-the-fold/LCP).
  //  • everything else loads lazily, decodes off the main thread (async) and
  //    shows a cheap blur placeholder until the bytes arrive.
  const perfProps = {
    sizes,
    priority,
    draggable,
    loading: priority ? ('eager' as const) : ('lazy' as const),
    decoding: 'async' as const,
    fetchPriority: priority ? ('high' as const) : ('auto' as const),
    placeholder: 'blur' as const,
    blurDataURL: BLUR_DATA_URL,
  };

  if (!valid) {
    // لا قص → العرض الافتراضي (يغطي الإطار)
    return (
      <Image
        src={src}
        alt={alt}
        fill
        {...perfProps}
        className={`object-cover ${imgClassName}`}
      />
    );
  }

  const c = crop!;
  return (
    <span
      className={`absolute block ${imgClassName}`}
      style={{
        width: `${100 / c.w}%`,
        height: `${100 / c.h}%`,
        left: `${(-c.x * 100) / c.w}%`,
        top: `${(-c.y * 100) / c.h}%`,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        {...perfProps}
        className="object-fill"
      />
    </span>
  );
}
