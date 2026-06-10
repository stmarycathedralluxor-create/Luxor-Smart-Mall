'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin,
  Store as StoreIcon,
  Package,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
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
      className="group relative block animate-fade-in"
    >
      {/* Outer wrapper – NO overflow-hidden so the floating logo stays whole */}
      <div className="relative bg-white rounded-3xl border border-luxor-gold/20 group-hover:border-luxor-gold/60 shadow-sm group-hover:shadow-2xl transition-all duration-300 flex flex-col h-full">
        {/* Cover (this one IS clipped, but logo lives in a sibling) */}
        <div className="relative aspect-[16/9] rounded-t-3xl overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-darkgold">
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
          {/* Cinematic gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/85 via-luxor-obsidian/15 to-transparent pointer-events-none" />

          {/* Product count chip - top corner */}
          {typeof productCount === 'number' && (
            <span className="absolute top-3 end-3 inline-flex items-center gap-1 bg-white/90 backdrop-blur-md border border-luxor-gold/30 px-2.5 py-1 rounded-full text-[11px] font-bold text-luxor-darkgold shadow-sm">
              <Package size={11} />
              {productCount} {t.store.products}
            </span>
          )}

          {/* City chip - bottom left over cover */}
          {store.city && (
            <span className="absolute bottom-3 start-3 inline-flex items-center gap-1 bg-luxor-obsidian/60 backdrop-blur-md text-white border border-white/15 px-2.5 py-1 rounded-full text-[11px] font-semibold">
              <MapPin size={11} className="text-luxor-goldlight" />
              {store.city}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pt-12 pb-5 flex flex-col flex-1 relative">
          {/* Floating Logo — sits OVER the cover-body boundary, NOT clipped */}
          <div className="absolute -top-10 start-5 z-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-luxor overflow-hidden">
                {store.logo_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={store.logo_url}
                      alt={store.name}
                      fill
                      sizes="80px"
                      className="object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-luxor-goldlight via-luxor-gold to-luxor-darkgold flex items-center justify-center font-black text-luxor-obsidian text-3xl">
                    {store.name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Verified badge */}
              <div
                className="absolute -bottom-1 -end-1 bg-gradient-to-br from-luxor-gold to-luxor-darkgold text-luxor-obsidian rounded-full p-1 shadow ring-2 ring-white"
                title="متجر موثّق"
              >
                <ShieldCheck size={11} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <h3 className="font-black text-luxor-obsidian text-lg leading-tight mb-1 group-hover:text-luxor-darkgold transition line-clamp-1">
            {store.name}
          </h3>

          {store.description ? (
            <p className="text-sm text-luxor-obsidian/65 line-clamp-2 mb-4 leading-relaxed">
              {store.description}
            </p>
          ) : (
            <p className="text-sm text-luxor-obsidian/40 italic mb-4">
              {isRtl ? 'متجر رسمي على لوكسور سمارت مول' : 'Official store on Luxor Smart Mall'}
            </p>
          )}

          <div className="mt-auto pt-3 border-t border-luxor-gold/15 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-luxor-darkgold uppercase tracking-wider">
              <ShieldCheck size={12} />
              {isRtl ? 'موثّق' : 'Verified'}
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-luxor-darkgold font-bold group-hover:gap-2 transition-all">
              {isRtl ? 'زيارة المتجر' : 'Visit store'}
              {isRtl ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
