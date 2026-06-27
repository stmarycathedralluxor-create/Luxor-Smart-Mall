'use client';

import { SwiperSlide } from 'swiper/react';

import HomeCarousel from './HomeCarousel';
import ProductCard from './ProductCard';
import type { ProductWithStore } from '@/lib/types';

/**
 * ProductsCarousel — قطار أفقي (Swiper) لأحدث المنتجات في الصفحة الرئيسية.
 * يعيد استخدام ProductCard كما هو لكن جنب بعضه بدلاً من شبكة.
 */
export default function ProductsCarousel({ products }: { products: ProductWithStore[] }) {
  return (
    <HomeCarousel
      count={products.length}
      // موبايل: كارتان ظاهران (2.2) بكروت مُصغّرة، والباقي يظهر بالتمرير.
      slidesPerViewBase={2.2}
      spaceBetween={12}
      breakpoints={{
        640: { slidesPerView: 2.6, spaceBetween: 16 },
        768: { slidesPerView: 3.4, spaceBetween: 18 },
        1024: { slidesPerView: 4.4, spaceBetween: 20 },
      }}
    >
      {products.map((p) => (
        <SwiperSlide key={p.id} className="!h-auto pb-2">
          <ProductCard product={p} />
        </SwiperSlide>
      ))}
    </HomeCarousel>
  );
}
