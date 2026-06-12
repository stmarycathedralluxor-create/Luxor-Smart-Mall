'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Store as StoreIcon,
  Package,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';
import { useLocale } from './LocaleProvider';
import StoreLogoFrame from './StoreLogoFrame';
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
  const isVerified = store.is_verified === true;

  return (
    <Link
      href={`/stores/${store.slug}`}
      className="group relative block animate-fade-in"
    >
      {/* Golden metal outer border */}
      <div className="relative bg-gold-metal p-[2px] rounded-3xl shadow-md group-hover:shadow-luxor-lg transition-all duration-300 h-full">
        {/* Inner card — creamy marble body */}
        <div className="relative bg-marble rounded-[22px] flex flex-col h-full overflow-visible">
          {/* Cover — black pharaonic header */}
          <div className="relative aspect-[16/9] rounded-t-[22px] overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-black">
            {store.cover_url ? (
              <Image
                src={store.cover_url}
                alt={store.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
                <StoreIcon size={72} />
              </div>
            )}
            {/* Cinematic dark gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/90 via-luxor-obsidian/20 to-transparent pointer-events-none" />
            {/* Golden hairline under the cover */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />

            {/* Product count chip */}
            {typeof productCount === 'number' && (
              <span className="absolute top-3 end-3 inline-flex items-center gap-1 bg-luxor-obsidian/70 backdrop-blur-md border border-luxor-gold/40 px-2.5 py-1 rounded-full text-[11px] font-bold text-luxor-goldlight shadow-sm">
                <Package size={11} />
                {productCount} {t.store.products}
              </span>
            )}

            {/* City chip */}
            {store.city && (
              <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 bg-luxor-obsidian/60 backdrop-blur-md text-white border border-luxor-gold/25 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                <MapPin size={11} className="text-luxor-goldlight" />
                {store.city}
              </span>
            )}
          </div>

          {/* Body */}
          <div className="px-5 pt-12 pb-5 flex flex-col flex-1 relative">
            {/* Floating logo with golden metal + 2px white frame */}
            <div className="absolute -top-10 start-5 z-10">
              <StoreLogoFrame
                logoUrl={store.logo_url}
                name={store.name}
                isVerified={isVerified}
                sizeClass="w-[72px] h-[72px]"
                fallbackTextClass="text-3xl"
                badgeSize={12}
                sizes="72px"
              />
            </div>

            <h3 className="font-black text-luxor-obsidian text-lg leading-tight mb-1 group-hover:text-luxor-darkgold transition line-clamp-1 flex items-center gap-1.5">
              <span className="line-clamp-1">{store.name}</span>
              {isVerified && (
                <BadgeCheck
                  size={16}
                  className="text-luxor-darkgold shrink-0"
                  aria-label={isRtl ? 'موثّق' : 'Verified'}
                />
              )}
            </h3>

            {store.description ? (
              <p className="text-sm text-luxor-obsidian/65 line-clamp-2 mb-4 leading-relaxed">
                {store.description}
              </p>
            ) : (
              <p className="text-sm text-luxor-obsidian/40 italic mb-4">
                {isRtl ? 'متجر رسمي على الأقصر سمارت مول' : 'Official store on Luxor Smart Mall'}
              </p>
            )}

            <div className="mt-auto pt-3 border-t border-luxor-gold/25 flex items-center justify-between">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-luxor-darkgold uppercase tracking-wider">
                  <BadgeCheck size={12} />
                  {isRtl ? 'موثّق' : 'Verified'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-luxor-obsidian/45 uppercase tracking-wider">
                  <StoreIcon size={12} />
                  {isRtl ? 'متجر رسمي' : 'Official store'}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-sm text-luxor-darkgold font-bold group-hover:gap-2 transition-all">
                {isRtl ? 'زيارة المتجر' : 'Visit store'}
                {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
