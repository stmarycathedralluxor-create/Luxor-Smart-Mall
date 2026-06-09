'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Store as StoreIcon } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import type { Store } from '@/lib/types';

export default function StoreCard({ store, productCount }: { store: Store; productCount?: number }) {
  const { t } = useLocale();

  return (
    <Link href={`/stores/${store.slug}`} className="card group block animate-fade-in">
      <div className="aspect-[16/9] relative bg-gradient-to-br from-luxor-navy to-luxor-gold overflow-hidden">
        {store.cover_url ? (
          <Image
            src={store.cover_url}
            alt={store.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            <StoreIcon size={64} />
          </div>
        )}
      </div>
      <div className="p-5 -mt-8 relative">
        <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden mb-3">
          {store.logo_url ? (
            <Image src={store.logo_url} alt={store.name} width={64} height={64} className="object-cover" />
          ) : (
            <div className="w-full h-full bg-luxor-gold flex items-center justify-center font-bold text-luxor-navy text-2xl">
              {store.name.charAt(0)}
            </div>
          )}
        </div>
        <h3 className="font-bold text-luxor-navy text-lg mb-1">{store.name}</h3>
        {store.description && (
          <p className="text-sm text-luxor-navy/70 line-clamp-2 mb-3">{store.description}</p>
        )}
        <div className="flex items-center justify-between text-xs text-luxor-navy/60">
          {store.city && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {store.city}
            </span>
          )}
          {typeof productCount === 'number' && (
            <span className="bg-luxor-sandlight px-2 py-1 rounded-full font-semibold text-luxor-navy">
              {productCount} {t.store.products}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
