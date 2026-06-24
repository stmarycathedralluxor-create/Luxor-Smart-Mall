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
  fullWidth = false,
}: {
  children: React.ReactNode;
  /** عدد العناصر — يُستخدم لإظهار/إخفاء أزرار التنقل */
  count: number;
  slidesPerViewBase?: number;
  spaceBetween?: number;
  breakpoints?: CarouselBreakpoints;
  className?: string;
  /**
   * fullWidth: على الموبايل يعرض كارت واحد بعرض الشاشة بالكامل، والسحب
   * ينتقل لكارت واحد في كل مرة (snap محكم) بدل التمرير الحر. مفيد للصفحة
   * الرئيسية حيث طلب المستخدم كروتاً بعرض كامل تنتقل عند السحب.
   */
  fullWidth?: boolean;
}) {
  const { locale } = useLocale();
  const uid = useId().replace(/:/g, '');
  const prevCls = `lsm-hc-prev-${uid}`;
  const nextCls = `lsm-hc-next-${uid}`;

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const showNav = count > 1;

  // وضع العرض الكامل: كارت واحد على الموبايل + snap لكارت واحد عند السحب.
  const effBase = fullWidth ? 1 : slidesPerViewBase;
  const effSpace = fullWidth ? 12 : spaceBetween;

  return (
    <div className={`lsm-home-carousel relative ${fullWidth ? 'lsm-hc-full' : ''} ${className}`}>
      <Swiper
        modules={[Navigation, A11y, FreeMode, Mousewheel]}
        dir={dir}
        key={dir /* re-init on direction change so RTL math is correct */}
        slidesPerView={effBase}
        spaceBetween={effSpace}
        centeredSlides={false}
        // في وضع العرض الكامل نُعطّل التمرير الحر حتى يستقرّ على كارت واحد
        // عند كل سحبة (snap)، وإلا نُبقي التمرير الحر الانسيابي القديم.
        freeMode={fullWidth ? false : { enabled: true, sticky: false, momentumBounce: false }}
        slidesPerGroup={1}
        mousewheel={{ forceToAxis: true }}
        grabCursor
        navigation={showNav ? { prevEl: `.${prevCls}`, nextEl: `.${nextCls}` } : false}
        breakpoints={breakpoints}
        className={`!py-2 ${fullWidth ? '!overflow-hidden !px-0' : '!overflow-visible !px-1'}`}
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
