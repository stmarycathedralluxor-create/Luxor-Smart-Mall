'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Store as StoreIcon, Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { Store } from '@/lib/types';

export default function StoreCard({
  store,
  productCount,
}: {
  store: Store;
  productCount?: number;
}) {
  const { t, locale } = useLocale();
  const isRtl = locale === 'ar';

  return (
    <Link
      href={`/stores/${store.slug}`}
      className="card group block animate-fade-in flex flex-col h-full"
    >
      {/* Cover */}
      <div className="aspect-[16/9] relative bg-gradient-to-br from-luxor-navy via-luxor-charcoal to-luxor-darkgold overflow-hidden">
        {store.cover_url ? (
          <Image
            src={store.cover_url}
            alt={store.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <StoreIcon size={64} />
          </div>
        )}
        {/* dark gradient at the bottom of the cover to make the floating logo + name pop */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
      </div>

      <div className="p-5 -mt-10 relative flex flex-col flex-1">
        {/* Logo + product count chip on the same row */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-luxor overflow-hidden relative shrink-0">
            {store.logo_url ? (
              <Image
                src={store.logo_url}
                alt={store.name}
                fill
                sizes="64px"
                className="object-contain p-0.5"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center font-bold text-luxor-navy text-2xl">
                {store.name.charAt(0)}
              </div>
            )}
          </div>

          {typeof productCount === 'number' && (
            <span className="inline-flex items-center gap-1 bg-luxor-gold/15 border border-luxor-gold/40 px-2.5 py-1 rounded-full text-[11px] font-bold text-luxor-darkgold whitespace-nowrap">
              <Package size={11} />
              {productCount} {t.store.products}
            </span>
          )}
        </div>

        <h3 className="font-bold text-luxor-navy text-lg leading-tight mb-1 group-hover:text-luxor-darkgold transition line-clamp-1">
          {store.name}
        </h3>

        {store.description ? (
          <p className="text-sm text-luxor-navy/70 line-clamp-2 mb-3 leading-relaxed">
            {store.description}
          </p>
        ) : (
          <p className="text-sm text-luxor-navy/40 italic mb-3">
            {isRtl ? 'متجر رسمي على لوكسور سمارت مول' : 'Official store on Luxor Smart Mall'}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-luxor-gold/15 flex items-center justify-between text-xs">
          {store.city ? (
            <span className="flex items-center gap-1 text-luxor-navy/70">
              <MapPin size={12} className="text-luxor-gold" />
              {store.city}
            </span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-luxor-darkgold font-semibold group-hover:gap-2 transition-all">
            {isRtl ? 'زيارة المتجر' : 'Visit store'}
            {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
          </span>
        </div>
      </div>
    </Link>
  );
}
