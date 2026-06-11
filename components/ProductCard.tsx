'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, Store as StoreIcon, Tag, MapPin, BadgeCheck } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { ProductWithStore } from '@/lib/types';

export default function ProductCard({ product }: { product: ProductWithStore }) {
  const { locale, t } = useLocale();
  const img = product.images?.[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block animate-fade-in h-full"
    >
      {/* Golden metal outer border */}
      <div className="relative bg-gold-metal p-[2px] rounded-2xl shadow-sm group-hover:shadow-luxor-lg transition-all duration-300 h-full">
        {/* Creamy marble inner card */}
        <div className="relative bg-marble rounded-[14px] overflow-hidden flex flex-col h-full">
          <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-black">
            {img ? (
              <Image
                src={img}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-gold/40">
                <StoreIcon size={56} />
              </div>
            )}

            {/* subtle top gradient for legibility of the chips */}
            <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
            {/* golden hairline under the image */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />

            {!product.is_available && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-bold shadow">
                  {t.product.unavailable}
                </span>
              </div>
            )}

            {product.category && (
              <span className="absolute top-2 start-2 bg-luxor-obsidian/70 backdrop-blur border border-luxor-gold/40 px-2.5 py-1 rounded-full text-[11px] font-semibold text-luxor-goldlight shadow-sm">
                <span className="me-0.5">{product.category.icon}</span>
                {locale === 'ar' ? product.category.name_ar : product.category.name_en}
              </span>
            )}

            {/* views pill */}
            <span className="absolute top-2 end-2 bg-black/55 backdrop-blur text-luxor-goldlight border border-luxor-gold/25 px-2 py-0.5 rounded-full text-[10px] font-medium inline-flex items-center gap-1">
              <Eye size={11} /> {product.views ?? 0}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 flex flex-col flex-1">
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
