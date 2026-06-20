'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Maximize2, Store as StoreIcon } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, A11y, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

import CatalogLightbox from '@/components/CatalogLightbox';
import type { ProductWithStore, Store } from '@/lib/types';

/** شريحة واحدة = صورة واحدة لكل منتج (صورة المنتج الأولى). */
type Slide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

/**
 * يبني شرائح الكتالوج: صورة واحدة فقط لكل منتج (الصورة الأولى).
 * عدد المنتجات غير محدود، لكن لكل منتج صورة واحدة في العرض.
 */
export function buildCatalogSlides(products: ProductWithStore[]): Slide[] {
  return products.map((product) => ({
    key: String(product.id),
    img: product.images?.[0] ?? null,
    product,
  }));
}

/**
 * MagazineFlipbook — عارض كتالوج أنيق:
 *
 *  • معاينة داخل الصفحة (Swiper) تتحرّك لوحدها، صورة واحدة لكل منتج.
 *  • الضغط عليها يفتح عارضاً بملء الشاشة (CatalogLightbox) — سحب طبيعي
 *    وسلس، تكبير، شريط مصغّرات، عرض كامل على الجوال — بدءاً من نفس الصورة.
 *  • الصور object-contain — تُحتوى بالكامل بلا تمطيط ولا قصّ.
 */
export default function MagazineFlipbook({
  title,
  products,
  store,
  coverImage,
  /** تشغيل تلقائي للمعاينة داخل الصفحة (الكارت يتحرّك لوحده). */
  autoPlayPreview = false,
  /** فتح ملء الشاشة تلقائياً عند فتح رابط المشاركة (?view=full أو #full). */
  autoFullscreenFromUrl = false,
  /** وضع المشاركة: يفتح العرض بملء الشاشة فقط (بلا معاينة/خلفية) وزر الإغلاق
   *  يرجع لصفحة الكتالوج العادية بدل كشف معاينة خلفه. */
  sharedFullView = false,
}: {
  title: string;
  products: ProductWithStore[];
  /** متجر الكتالوج (احتياطي إن لم يكن للمنتج متجر خاص). */
  store?: Pick<Store, 'name' | 'slug' | 'logo_url'> | null;
  coverImage?: string | null;
  autoPlayPreview?: boolean;
  autoFullscreenFromUrl?: boolean;
  sharedFullView?: boolean;
}) {
  void coverImage;
  void title;
  const router = useRouter();

  // صورة واحدة لكل منتج (الصورة الأولى) — عدد المنتجات غير محدود.
  const slides = useMemo<Slide[]>(() => buildCatalogSlides(products), [products]);

  const total = slides.length;
  // في وضع المشاركة نبدأ بملء الشاشة مباشرةً.
  const [open, setOpen] = useState(sharedFullView);
  // الشريحة المعروضة في المعاينة.
  const [previewIndex, setPreviewIndex] = useState(0);
  // الفهرس داخل العارض بملء الشاشة.
  const [fsIndex, setFsIndex] = useState(0);

  // عند فتح رابط مشاركة الكتالوج (الذي يحمل ?view=full أو #full) نفتح
  // العارض بملء الشاشة مباشرةً.
  useEffect(() => {
    if (!autoFullscreenFromUrl) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const wantsFull =
      params.get('view') === 'full' ||
      params.get('fullscreen') === '1' ||
      window.location.hash === '#full';
    if (wantsFull) {
      setFsIndex(0);
      setOpen(true);
    }
  }, [autoFullscreenFromUrl]);

  if (!total) return null;

  // إغلاق العرض: في وضع المشاركة نرجع لصفحة الكتالوج العادية (بدون #full).
  const closeFullscreen = () => {
    if (sharedFullView) {
      const clean = typeof window !== 'undefined' ? window.location.pathname : '';
      if (clean) router.replace(clean);
    }
    setOpen(false);
  };

  const openFullscreen = () => {
    // ابدأ ملء الشاشة من الصورة المعروضة حالياً في المعاينة.
    setFsIndex(previewIndex);
    setOpen(true);
  };

  // متجر المنتج المعروض حالياً (للّوجو في العارض).
  const activeStore = slides[fsIndex]?.product?.store ?? store ?? null;

  const lightbox = (
    <CatalogLightbox
      open={open}
      slides={slides}
      index={fsIndex}
      onIndexChange={setFsIndex}
      onClose={closeFullscreen}
      activeStore={activeStore}
      onNavigate={() => setOpen(false)}
    />
  );

  // وضع المشاركة: لا نعرض المعاينة إطلاقاً — العارض بملء الشاشة فقط منذ الفتح.
  if (sharedFullView) {
    return lightbox;
  }

  /* ─────────── معاينة داخل الصفحة (تُفتح بملء الشاشة عند الضغط) ─────────── */
  return (
    <>
      <button
        type="button"
        onClick={openFullscreen}
        aria-label="افتح الكتالوج بملء الشاشة"
        className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-black"
      >
        <div className="lsm-cat relative">
          <Swiper
            modules={[Pagination, A11y, Autoplay]}
            dir="ltr"
            effect="slide"
            slidesPerView={1}
            spaceBetween={12}
            speed={560}
            grabCursor
            loop={total > 1}
            allowTouchMove={false}
            autoplay={
              autoPlayPreview && total > 1
                ? { delay: 2600, disableOnInteraction: false, pauseOnMouseEnter: true }
                : false
            }
            pagination={total > 1 ? { clickable: true, dynamicBullets: true } : false}
            onSlideChange={(sw) => setPreviewIndex(sw.realIndex)}
            className="lsm-cat-swiper"
          >
            {slides.map(({ key, img, product }, i) => (
              <SwiperSlide key={key}>
                <div className="relative w-full aspect-square sm:aspect-[4/3]">
                  {img ? (
                    <Image
                      src={img}
                      alt={product.title}
                      fill
                      sizes="(max-width:768px) 100vw, 800px"
                      className="object-contain"
                      priority={i === 0}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-white/15">
                      <StoreIcon size={72} />
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* تلميح ملء الشاشة */}
        <span className="pointer-events-none absolute top-3 end-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition group-hover:bg-black/75">
          <Maximize2 size={14} /> ملء الشاشة
        </span>
      </button>

      {lightbox}
    </>
  );
}
