import { Home, Store, LayoutGrid, BookOpen, Search } from 'lucide-react';

/**
 * الصفحات الرئيسية الخمس — تظهر في شريط التنقّل السفلي وتُتيح التنقّل
 * بالسحب يميناً/يساراً بينها بالترتيب نفسه.
 */
export const MAIN_NAV = [
  { href: '/', icon: Home, ar: 'الرئيسية', en: 'Home' },
  { href: '/stores', icon: Store, ar: 'المتاجر', en: 'Stores' },
  { href: '/categories', icon: LayoutGrid, ar: 'الأقسام', en: 'Categories' },
  { href: '/catalog', icon: BookOpen, ar: 'الكتالوج', en: 'Catalog' },
  { href: '/search', icon: Search, ar: 'بحث', en: 'Search' },
] as const;

export type MainNavItem = (typeof MAIN_NAV)[number];

/** فهرس الصفحة الرئيسية الحالية ضمن MAIN_NAV (أو -1 إن لم تكن صفحة رئيسية). */
export function mainNavIndex(pathname: string): number {
  // مطابقة دقيقة للصفحة الرئيسية، و"تبدأ بـ" لبقيّة الصفحات
  // (مع استثناء الصفحات الفرعية مثل /stores/[slug] إن رغبنا — لكن
  // نبقيها مفعّلة في الشريط لتمييز القسم).
  if (pathname === '/') return 0;
  let best = -1;
  let bestLen = 0;
  MAIN_NAV.forEach((item, i) => {
    if (item.href === '/') return;
    if (pathname === item.href || pathname.startsWith(item.href + '/')) {
      if (item.href.length > bestLen) {
        best = i;
        bestLen = item.href.length;
      }
    }
  });
  return best;
}
