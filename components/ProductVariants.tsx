'use client';

/**
 * ProductVariants — عرض المقاسات والألوان في صفحة المنتج.
 * عند اختيار لون مرتبط بصورة، يُرسل حدث للمعرض لعرض تلك الصورة.
 */

import { useEffect, useState } from 'react';
import { Ruler, Palette, Check } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { ProductColor, ProductSize } from '@/lib/types';

/**
 * حدث مخصص يبلّغ باقي الصفحة (زر الطلب عبر واتساب) بالمقاس/اللون
 * المختارين حالياً حتى تتضمنهما رسالة الطلب تلقائياً.
 */
export const VARIANT_EVENT = 'lsm:variant-selected';
export type VariantSelection = { size: string | null; color: string | null };

export default function ProductVariants({
  sizes,
  colors,
}: {
  sizes?: ProductSize[] | null;
  colors?: ProductColor[] | null;
}) {
  const { locale } = useLocale();
  const isAr = locale === 'ar';
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // أبلغ زر الطلب بأي تغيير في الاختيار
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent<VariantSelection>(VARIANT_EVENT, {
        detail: { size: selectedSize, color: selectedColor },
      })
    );
  }, [selectedSize, selectedColor]);

  const hasSizes = !!sizes?.length;
  const hasColors = !!colors?.length;
  if (!hasSizes && !hasColors) return null;

  const pickColor = (c: ProductColor) => {
    if (c.available === false) return;
    setSelectedColor(c.name);
    // Tell the gallery to show this color's image
    if (c.image) {
      window.dispatchEvent(
        new CustomEvent('lsm:show-product-image', { detail: { url: c.image } })
      );
    }
  };

  return (
    <div className="mb-6 space-y-4">
      {/* ───── المقاسات ───── */}
      {hasSizes && (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy mb-3">
            <Ruler size={16} className="text-luxor-darkgold" />
            {isAr ? 'المقاسات' : 'Sizes'}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes!.map((s) => {
              const soldOut = !s.available || (typeof s.qty === 'number' && s.qty <= 0);
              const active = selectedSize === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setSelectedSize(active ? null : s.name)}
                  className={`relative min-w-[3rem] px-3 py-2 rounded-xl border-2 text-sm font-bold transition ${
                    soldOut
                      ? 'border-luxor-sand bg-luxor-sandlight text-luxor-navy/30 cursor-not-allowed line-through'
                      : active
                        ? 'border-luxor-gold bg-luxor-gold/15 text-luxor-navy shadow-sm'
                        : 'border-luxor-sand bg-white text-luxor-navy/70 hover:border-luxor-gold/60'
                  }`}
                  title={
                    soldOut
                      ? isAr ? 'غير متاح' : 'Not available'
                      : typeof s.qty === 'number'
                        ? isAr ? `متاح: ${s.qty}` : `Available: ${s.qty}`
                        : undefined
                  }
                >
                  {s.name}
                  {active && !soldOut && (
                    <span className="absolute -top-1.5 -end-1.5 bg-luxor-gold text-luxor-obsidian rounded-full p-0.5">
                      <Check size={10} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* available quantity hint for selected size */}
          {selectedSize && (() => {
            const s = sizes!.find((x) => x.name === selectedSize);
            if (!s || typeof s.qty !== 'number' || s.qty <= 0) return null;
            return (
              <p className="text-xs text-emerald-700 mt-2 font-medium">
                {isAr ? `متاح ${s.qty} قطعة من مقاس ${s.name}` : `${s.qty} in stock for size ${s.name}`}
              </p>
            );
          })()}
          {sizes!.some((s) => !s.available || (typeof s.qty === 'number' && s.qty <= 0)) && (
            <p className="text-[11px] text-luxor-navy/45 mt-2">
              {isAr ? 'المقاسات المشطوبة غير متاحة حالياً' : 'Crossed-out sizes are currently unavailable'}
            </p>
          )}
        </div>
      )}

      {/* ───── الألوان ───── */}
      {hasColors && (
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy mb-3">
            <Palette size={16} className="text-luxor-darkgold" />
            {isAr ? 'الألوان' : 'Colors'}
            {selectedColor && (
              <span className="font-normal text-luxor-navy/60 text-xs">— {selectedColor}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors!.map((c) => {
              const soldOut = c.available === false;
              const active = selectedColor === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={soldOut}
                  onClick={() => pickColor(c)}
                  className={`group/color flex flex-col items-center gap-1 ${soldOut ? 'cursor-not-allowed opacity-40' : ''}`}
                  title={c.name + (soldOut ? (isAr ? ' — غير متاح' : ' — unavailable') : '')}
                >
                  <span
                    className={`relative w-9 h-9 rounded-full border-2 shadow-sm transition ${
                      active ? 'border-luxor-gold ring-2 ring-luxor-gold/40 scale-110' : 'border-white ring-1 ring-black/10'
                    }`}
                    style={{ backgroundColor: c.hex || '#999' }}
                  >
                    {active && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check
                          size={16}
                          strokeWidth={3}
                          className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                        />
                      </span>
                    )}
                    {soldOut && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-full h-0.5 bg-red-500 rotate-45 rounded" />
                      </span>
                    )}
                  </span>
                  <span className={`text-[10px] font-medium ${active ? 'text-luxor-darkgold' : 'text-luxor-navy/60'}`}>
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
          {colors!.some((c) => c.image) && (
            <p className="text-[11px] text-luxor-navy/45 mt-2">
              {isAr ? 'اختر اللون لعرض صورة المنتج بهذا اللون' : 'Select a color to see the product in that color'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
