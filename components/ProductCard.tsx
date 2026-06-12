'use client';

import Link from 'next/link';
import { Eye, Store as StoreIcon, Tag, MapPin, BadgeCheck, Zap, CalendarClock } from 'lucide-react';
import CroppedImage from './CroppedImage';
import { useLocale } from './LocaleProvider';
import { deliveryDaysLabel, discountPercent } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

export default function ProductCard({ product }: { product: ProductWithStore }) {
  const { locale, t } = useLocale();
  const img = product.images?.[0];
  const imgCrop = product.images_meta?.[0] ?? null;
  const isPreorder = product.delivery_type === 'preorder';
  const pct = discountPercent(product.price, product.compare_at_price);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block animate-fade-in h-full"
    >
      {/* Golden metal outer border */}
      <div className="relative bg-gold-metal p-[2px] rounded-2xl shadow-sm group-hover:shadow-luxor-lg transition-all duration-300 h-full">
        {/* Creamy marble inner card */}
        <div className="relative bg-marble rounded-[14px] overflow-hidden flex flex-col h-full">
          {/* ── Clean image: no badges covering it ── */}
          <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-black">
            {img ? (
              <span className="absolute inset-0 block group-hover:scale-110 transition-transform duration-700 ease-out">
                <CroppedImage
                  src={img}
                  crop={imgCrop}
                  alt={product.title}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </span>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-gold/40">
                <StoreIcon size={56} />
              </div>
            )}

            {/* golden hairline under the image */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />

            {/* "unavailable" overlay is the only allowed cover — it must block the product visually */}
            {!product.is_available && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-bold shadow">
                  {t.product.unavailable}
                </span>
              </div>
            )}
          </div>

          {/* ── Badges strip BELOW the image (not covering it) ── */}
          <div className="flex items-center gap-1.5 flex-wrap px-3 pt-2.5">
            {pct !== null && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm" dir="ltr">
                -{pct}%
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                isPreorder
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              {isPreorder ? <CalendarClock size={11} /> : <Zap size={11} />}
              {isPreorder
                ? product.delivery_days
                  ? deliveryDaysLabel(product.delivery_days, locale)
                  : t.product.preorder
                : t.product.instantDelivery}
            </span>
            {product.category && (
              <span className="bg-luxor-sandlight border border-luxor-sand px-2 py-0.5 rounded-full text-[10px] font-semibold text-luxor-navy/70">
                <span className="me-0.5">{product.category.icon}</span>
                {locale === 'ar' ? product.category.name_ar : product.category.name_en}
              </span>
            )}
            <span className="ms-auto text-luxor-navy/45 text-[10px] font-medium inline-flex items-center gap-1">
              <Eye size={11} /> {product.views ?? 0}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 pt-2 flex flex-col flex-1">
            <h3 className="font-bold text-luxor-obsidian line-clamp-2 mb-1.5 min-h-[2.6rem] text-sm sm:text-base leading-snug group-hover:text-luxor-darkgold transition">
              {product.title}
            </h3>

            {product.store && (
              <div className="text-[11px] sm:text-xs text-luxor-obsidian/60 mb-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 max-w-full truncate">
                  <StoreIcon size={12} className="text-luxor-darkgold shrink-0" />
                  <span className="truncate">{product.store.name}</span>
                  {product.store.is_verified && (
                    <BadgeCheck size={12} className="text-luxor-darkgold shrink-0" />
                  )}
                </span>
                {product.store.city && (
                  <span className="inline-flex items-center gap-0.5 text-luxor-obsidian/45">
                    <MapPin size={11} />
                    <span className="truncate">{product.store.city}</span>
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto pt-2 border-t border-luxor-gold/25">
              <span className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-bold text-luxor-goldlight bg-luxor-obsidian border border-luxor-gold/50 px-3 py-2 rounded-xl group-hover:bg-gold-gradient group-hover:text-luxor-obsidian group-hover:border-luxor-gold transition shadow-sm">
                <Tag size={14} />
                {t.product.askPrice}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
