'use client';

import { SwiperSlide } from 'swiper/react';

import HomeCarousel from './HomeCarousel';
import CatalogCard from './CatalogCard';
import type { ProductWithStore, Store } from '@/lib/types';

export type HomeCatalogCard = {
  id: string;
  title: string;
  slug: string;
  count: number;
  products: ProductWithStore[];
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
};

/**
 * CatalogsCarousel — قطار أفقي (Swiper) للكتالوجات في الصفحة الرئيسية.
 * يعيد استخدام CatalogCard كما هو لكن جنب بعضه بدلاً من شبكة.
 */
export default function CatalogsCarousel({ catalogs }: { catalogs: HomeCatalogCard[] }) {
  return (
    <HomeCarousel
      count={catalogs.length}
      slidesPerViewBase={1.3}
      spaceBetween={16}
      breakpoints={{
        640: { slidesPerView: 2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 24 },
      }}
    >
      {catalogs.map((c) => (
        <SwiperSlide key={c.id} className="!h-auto pb-2">
          <CatalogCard
            title={c.title}
            slug={c.slug}
            products={c.products}
            count={c.count}
            store={c.store ?? null}
          />
        </SwiperSlide>
      ))}
    </HomeCarousel>
  );
}
