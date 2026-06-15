'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useLocale } from './LocaleProvider';
import { MAIN_NAV, mainNavIndex } from '@/lib/mainNav';

/**
 * BottomNav — شريط تنقّل سفلي للجوال يعرض الصفحات الرئيسية الخمس،
 * مع إمكانية التنقّل بينها بالسحب (swipe) يميناً/يساراً.
 *
 *  • يظهر على الجوال فقط (md:hidden).
 *  • يُبرز الصفحة الحالية.
 *  • اتجاه السحب ثابت ولا يتأثّر باللغة (RTL/LTR):
 *      - السحب لليسار  = الصفحة التالية.
 *      - السحب لليمين  = الصفحة السابقة.
 *  • انتقال الصفحات يصاحبه أنميشن انزلاقي أنيق (يدخل المحتوى الجديد من
 *    الجهة المناسبة لاتجاه السحب).
 */
export default function BottomNav() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = mainNavIndex(pathname);

  // نُبقي أحدث قيمة للفهرس داخل ref حتى يستخدمها مستمع اللمس دون إعادة تسجيله.
  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;

  // اتجاه آخر انتقال (1 = للأمام/التالي، -1 = للخلف/السابق) لتشغيل الأنميشن
  // المناسب على المحتوى بعد تغيّر المسار.
  const pendingDirRef = useRef<1 | -1 | 0>(0);

  // التنقّل بالسحب الأفقي بين الصفحات الرئيسية فقط.
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      if (indexRef.current < 0) return; // لسنا على صفحة رئيسية
      if (e.touches.length !== 1) return;
      // تجاهل السحب الذي يبدأ من فوق عناصر قابلة للسحب أفقياً
      // (سلايدر/كاروسيل) حتى لا نتعارض معها.
      const target = e.target as HTMLElement | null;
      if (target?.closest('.swiper, [data-no-page-swipe], input, textarea, select')) {
        tracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const idx = indexRef.current;
      if (idx < 0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const THRESHOLD = 70;
      // سحب أفقي واضح فقط (ليس تمريراً رأسياً)
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      // اتجاه ثابت لا يتأثّر باللغة:
      //   • السحب لليسار (dx < 0) = "التالي".
      //   • السحب لليمين (dx > 0) = "السابق".
      const movingForward = dx < 0;
      const nextIndex = movingForward ? idx + 1 : idx - 1;
      if (nextIndex < 0 || nextIndex >= MAIN_NAV.length) return;

      // سجّل اتجاه الانتقال لتشغيل الأنميشن بعد تغيّر المسار.
      pendingDirRef.current = movingForward ? 1 : -1;
      router.push(MAIN_NAV[nextIndex].href);
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [router]);

  // بعد تغيّر المسار: شغّل أنميشن الانزلاق على المحتوى الرئيسي بالاتجاه الصحيح
  // (يدخل المحتوى الجديد من اليمين عند "التالي"، ومن اليسار عند "السابق").
  useEffect(() => {
    const dir = pendingDirRef.current;
    if (!dir) return;
    pendingDirRef.current = 0;
    const main = document.querySelector('main');
    if (!main) return;
    const enterClass = dir === 1 ? 'animate-page-from-right' : 'animate-page-from-left';
    main.classList.remove('animate-page-from-right', 'animate-page-from-left');
    // إعادة التدفّق لإعادة تشغيل الأنميشن عند الانتقال السريع المتتالي.
    void (main as HTMLElement).offsetWidth;
    main.classList.add(enterClass);
    const clear = () => main.classList.remove(enterClass);
    main.addEventListener('animationend', clear, { once: true });
    const fallback = window.setTimeout(clear, 600);
    return () => {
      window.clearTimeout(fallback);
      main.removeEventListener('animationend', clear);
    };
  }, [pathname]);

  // لا نعرض الشريط خارج الصفحات الرئيسية (مثل صفحات التفاصيل/اللوحة).
  if (activeIndex < 0) return null;

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-[60] border-t border-luxor-gold/30 bg-white/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
      aria-label={ar ? 'التنقّل الرئيسي' : 'Main navigation'}
    >
      <ul className="grid grid-cols-5">
        {MAIN_NAV.map((item, i) => {
          const Icon = item.icon;
          const active = i === activeIndex;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => {
                  // التنقّل بالضغط أيضاً يشغّل الأنميشن المناسب للاتجاه.
                  if (i === activeIndex) return;
                  pendingDirRef.current = i > activeIndex ? 1 : -1;
                }}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition ${
                  active ? 'text-luxor-darkgold' : 'text-luxor-navy/55 hover:text-luxor-navy'
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                    active ? 'bg-luxor-gold/15' : ''
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span className="leading-none">{ar ? item.ar : item.en}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
