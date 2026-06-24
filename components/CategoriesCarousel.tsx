'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SwiperSlide } from 'swiper/react';

import { useLocale } from './LocaleProvider';
import HomeCarousel from './HomeCarousel';
import CroppedImage from './CroppedImage';
import type { Category } from '@/lib/types';

/**
 * CategoriesCarousel — قطار أفقي (Swiper) لأقسام الصفحة الرئيسية.
 *  • يعرض الصورة المختارة لكل قسم (image_url + image_meta) وليس الأيقونة.
 *  • يتراجع للأيقونة/الإيموجي فقط حين لا توجد صورة للقسم.
 *  • شرائح جنب بعضها بشكل احترافي بدلاً من شبكة/لستة.
 */
export default function CategoriesCarousel({ categories }: { categories: Category[] }) {
  const { locale } = useLocale();

  return (
    <HomeCarousel
      count={categories.length}
      fullWidth
      breakpoints={{
        // موبايل: قسم واحد بعرض الشاشة الكامل، والسحب ينقل لقسم واحد.
        640: { slidesPerView: 3.4, spaceBetween: 16 },
        768: { slidesPerView: 4.4, spaceBetween: 18 },
        1024: { slidesPerView: 5.4, spaceBetween: 20 },
        1280: { slidesPerView: 6.2, spaceBetween: 20 },
      }}
    >
      {categories.map((cat) => (
        <SwiperSlide key={cat.id} className="!h-auto">
          <Link
            href={`/categories/${cat.slug}`}
            className="group relative block overflow-hidden rounded-3xl bg-luxor-obsidian shadow-sm ring-1 ring-luxor-gold/15 transition-all hover:-translate-y-1 hover:shadow-luxor-lg hover:ring-luxor-gold/50"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              {cat.image_url ? (
                <span className="absolute inset-0 block transition-transform duration-700 ease-out group-hover:scale-110">
                  <CroppedImage
                    src={cat.image_url}
                    crop={cat.image_meta}
                    alt={locale === 'ar' ? cat.name_ar : cat.name_en}
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 16vw"
                  />
                </span>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-luxor-charcoal to-luxor-obsidian">
                  <span className="text-5xl opacity-90 drop-shadow-lg md:text-6xl">
                    {cat.icon ?? '📦'}
                  </span>
                </div>
              )}

              {/* تدرّج سفلي لقراءة النص */}
              <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian via-luxor-obsidian/25 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="text-sm font-black leading-tight text-white md:text-base">
                  {locale === 'ar' ? cat.name_ar : cat.name_en}
                </h3>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-white/0 transition-colors group-hover:text-luxor-goldlight">
                  {locale === 'ar' ? 'تصفّح' : 'Browse'}
                  <ArrowLeft size={12} className="rtl:rotate-180" />
                </span>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
        </SwiperSlide>
      ))}
    </HomeCarousel>
  );
}
