'use client';

import { SwiperSlide } from 'swiper/react';

import HomeCarousel from './HomeCarousel';
import StoreCard from './StoreCard';
import type { Store } from '@/lib/types';

/**
 * StoresCarousel — قطار أفقي (Swiper) للمتاجر المميزة في الصفحة الرئيسية.
 * يعيد استخدام StoreCard كما هو لكن جنب بعضه بدلاً من شبكة.
 */
export default function StoresCarousel({ stores }: { stores: Store[] }) {
  return (
    <HomeCarousel
      count={stores.length}
      slidesPerViewBase={1.1}
      spaceBetween={18}
      breakpoints={{
        640: { slidesPerView: 1.8, spaceBetween: 20 },
        768: { slidesPerView: 2.2, spaceBetween: 22 },
        1024: { slidesPerView: 3, spaceBetween: 24 },
      }}
    >
      {stores.map((store) => (
        <SwiperSlide key={store.id} className="!h-auto pb-2">
          <StoreCard store={store} />
        </SwiperSlide>
      ))}
    </HomeCarousel>
  );
}
