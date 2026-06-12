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

  if (!valid) {
    // لا قص → العرض الافتراضي (يغطي الإطار)
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        draggable={draggable}
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
        sizes={sizes}
        priority={priority}
        draggable={draggable}
        className="object-fill"
      />
    </span>
  );
}
