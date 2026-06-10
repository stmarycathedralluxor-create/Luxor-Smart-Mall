'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye, Store as StoreIcon, Tag } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { ProductWithStore } from '@/lib/types';

export default function ProductCard({ product }: { product: ProductWithStore }) {
  const { locale, t } = useLocale();
  const img = product.images?.[0];

  return (
    <Link href={`/products/${product.id}`} className="card group block animate-fade-in">
      <div className="aspect-square relative overflow-hidden bg-luxor-sandlight">
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-luxor-gold">
            <StoreIcon size={56} />
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-bold">
              {t.product.unavailable}
            </span>
          </div>
        )}
        {product.category && (
          <span className="absolute top-2 start-2 bg-white/90 backdrop-blur px-2 py-1 rounded-full text-xs font-medium text-luxor-navy">
            {product.category.icon} {locale === 'ar' ? product.category.name_ar : product.category.name_en}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-luxor-navy line-clamp-2 mb-1 min-h-[3rem]">
          {product.title}
        </h3>
        {product.store && (
          <p className="text-xs text-luxor-navy/60 mb-3 flex items-center gap-1">
            <StoreIcon size={12} />
            {product.store.name}
          </p>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-luxor-navy bg-luxor-gold/15 border border-luxor-gold/30 px-3 py-1.5 rounded-full group-hover:bg-luxor-gold group-hover:text-luxor-obsidian transition">
            <Tag size={13} />
            {t.product.askPrice}
          </span>
          <span className="flex items-center gap-1 text-xs text-luxor-navy/50 shrink-0">
            <Eye size={12} /> {product.views}
          </span>
        </div>
      </div>
    </Link>
  );
}
