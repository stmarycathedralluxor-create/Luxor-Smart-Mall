'use client';

import { useId } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y, FreeMode, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';

import { useLocale } from './LocaleProvider';

/**
 * HomeCarousel — قطار أفقي احترافي (Swiper) يُعرض فيه أبناؤه كشرائح
 * جنب بعضها بدلاً من شبكة/لستة. يدعم:
 *  • تمرير حر باللمس + عجلة الماوس + أزرار تنقل دائرية ذهبية.
 *  • عدد شرائح مرئية متجاوب (responsive) عبر breakpoints قابلة للضبط.
 *  • اتجاه RTL/LTR تلقائي حسب اللغة الحالية.
 *
 * الاستخدام: مرّر كل عنصر كـ <SwiperSlide> ضمن children، أو استخدم
 * الدالة المساعدة slideClassName للحفاظ على ارتفاع متساوٍ.
 */
export type CarouselBreakpoints = Record<number, { slidesPerView: number; spaceBetween?: number }>;

export default function HomeCarousel({
  children,
  count,
  slidesPerViewBase = 1.15,
  spaceBetween = 16,
  breakpoints,
  className = '',
}: {
  children: React.ReactNode;
  /** عدد العناصر — يُستخدم لإظهار/إخفاء أزرار التنقل */
  count: number;
  slidesPerViewBase?: number;
  spaceBetween?: number;
  breakpoints?: CarouselBreakpoints;
  className?: string;
}) {
  const { locale } = useLocale();
  const uid = useId().replace(/:/g, '');
  const prevCls = `lsm-hc-prev-${uid}`;
  const nextCls = `lsm-hc-next-${uid}`;

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const showNav = count > 1;

  return (
    <div className={`lsm-home-carousel relative ${className}`}>
      <Swiper
        modules={[Navigation, A11y, FreeMode, Mousewheel]}
        dir={dir}
        key={dir /* re-init on direction change so RTL math is correct */}
        slidesPerView={slidesPerViewBase}
        spaceBetween={spaceBetween}
        freeMode={{ enabled: true, sticky: false, momentumBounce: false }}
        mousewheel={{ forceToAxis: true }}
        grabCursor
        navigation={showNav ? { prevEl: `.${prevCls}`, nextEl: `.${nextCls}` } : false}
        breakpoints={breakpoints}
        className="!overflow-visible !px-1 !py-2"
      >
        {children}
      </Swiper>

      {showNav && (
        <>
          <button
            type="button"
            aria-label={locale === 'ar' ? 'السابق' : 'Previous'}
            className={`${prevCls} lsm-hc-btn absolute -top-[3.25rem] end-11 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-luxor-gold/40 bg-white text-luxor-darkgold shadow-sm transition hover:bg-luxor-gold hover:text-luxor-obsidian sm:inline-flex`}
          >
            {locale === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          <button
            type="button"
            aria-label={locale === 'ar' ? 'التالي' : 'Next'}
            className={`${nextCls} lsm-hc-btn absolute -top-[3.25rem] end-0 z-20 hidden h-9 w-9 items-center justify-center rounded-full border border-luxor-gold/40 bg-white text-luxor-darkgold shadow-sm transition hover:bg-luxor-gold hover:text-luxor-obsidian sm:inline-flex`}
          >
            {locale === 'ar' ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </>
      )}
    </div>
  );
}
