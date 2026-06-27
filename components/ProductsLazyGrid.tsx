'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ProductCard from './ProductCard';
import type { ProductWithStore } from '@/lib/types';

/**
 * ProductsLazyGrid — شبكة منتجات بتحميل تدريجي بنمط أمازون.
 * تستقبل قائمة المنتجات كاملةً (من الخادم) لكنها لا تعرض إلا دفعة منها،
 * ثم تزيد المعروض تلقائياً كلما اقترب المستخدم من نهاية القائمة بالسحب/التمرير
 * (IntersectionObserver). هذا يمنع بطء عرض آلاف الكروت دفعة واحدة.
 *
 * عمودان على الموبايل وأكثر على الشاشات الأكبر — نفس مظهر بقية الواجهات.
 */
export default function ProductsLazyGrid({
  products,
  pageSize = 12,
}: {
  products: ProductWithStore[];
  pageSize?: number;
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const visible = products.slice(0, visibleCount);
  const hasMore = visibleCount < products.length;

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, products.length));
        }
      },
      { rootMargin: '600px 0px' } // ابدأ التحميل قبل الوصول للنهاية بمسافة
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, pageSize, products.length]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div ref={sentinelRef} className="mt-8 flex justify-center">
        {hasMore ? (
          <span className="inline-flex items-center gap-2 text-luxor-darkgold">
            <Loader2 size={20} className="animate-spin" />
            جارٍ التحميل…
          </span>
        ) : (
          products.length > pageSize && (
            <span className="text-sm text-luxor-obsidian/40">— وصلت إلى النهاية —</span>
          )
        )}
      </div>
    </>
  );
}
