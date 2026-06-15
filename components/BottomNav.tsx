'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from './LocaleProvider';
import { MAIN_NAV, mainNavIndex } from '@/lib/mainNav';

/**
 * BottomNav — شريط تنقّل سفلي للجوال يعرض الصفحات الرئيسية الخمس.
 *
 *  • يظهر على الجوال فقط (md:hidden).
 *  • يُبرز الصفحة الحالية.
 *  • تنقّل عادي بالضغط (بدون سحب/أنميشن — الصفحات تُحمَّل مباشرةً).
 */
export default function BottomNav() {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const pathname = usePathname();
  const activeIndex = mainNavIndex(pathname);

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
