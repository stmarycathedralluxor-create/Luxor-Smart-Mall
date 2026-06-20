'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import {
  Store as StoreIcon,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { EffectCoverflow, Keyboard, Mousewheel, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';

import type { ProductWithStore, Store } from '@/lib/types';

type CatalogSlide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * CatalogLightbox — عارض كتالوج بملء الشاشة بأسلوب «Coverflow ثلاثي الأبعاد»
 * سينمائي فاخر:
 *
 *  • كاروسيل ثلاثي الأبعاد: الكارت الأوسط (النشط) أكبر وفي المنتصف، والكروت
 *    المجاورة تظهر جزئياً خلفه بزوايا دوران Y وعمق متدرّج (perspective).
 *  • خلفية داكنة فاخرة، زوايا مستديرة كبيرة، ظلال ناعمة وانعكاس خفيف.
 *  • الصور تحترم نسبتها الأصلية (object-contain) داخل كارت بزوايا مستديرة.
 *  • أسهم تنقّل تطفو على الحافتين، ونقاط ترقيم أسفل الكاروسيل.
 *  • انتقالات سلسة زنبركية (spring-based) بإحساس انزلاق ثلاثي الأبعاد.
 *  • لوجو متجر المنتج الحالي أعلى اليسار، وزر «عرض المنتج» أسفل المنتصف.
 */
export default function CatalogLightbox({
  open,
  slides,
  index,
  onIndexChange,
  onClose,
  activeStore,
  onNavigate,
}: {
  open: boolean;
  slides: CatalogSlide[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** متجر المنتج المعروض حالياً (للّوجو أعلى اليسار). */
  activeStore?: CardStore;
  /** يُستدعى قبل التنقّل لصفحة (متجر/منتج) — لإغلاق العرض. */
  onNavigate?: () => void;
}) {
  const items = slides.filter((s) => !!s.img);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(index);
  const swiperRef = useRef<SwiperType | null>(null);

  // التركيب على العميل فقط (Portal لجسم الصفحة).
  useEffect(() => setMounted(true), []);

  // مزامنة الفهرس الوارد عند الفتح.
  useEffect(() => {
    if (open) setActive(Math.min(index, Math.max(0, items.length - 1)));
  }, [open, index, items.length]);

  // قفل تمرير الصفحة خلف العرض + إغلاق بمفتاح Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open || !items.length) return null;

  const current = items[Math.min(active, items.length - 1)];
  const showStore = activeStore?.slug ? activeStore : current?.product?.store ?? null;

  const view = (
    <div
      className="lsm-cf fixed inset-0 z-[120] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="عارض الكتالوج بملء الشاشة"
    >
      {/* خلفية داكنة فاخرة + إغلاق بالنقر على الخلفية */}
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="lsm-cf-backdrop absolute inset-0 -z-10"
        tabIndex={-1}
      />

      {/* الرأس: لوجو المتجر + عدّاد + زر إغلاق */}
      <div className="relative z-10 flex items-center justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {showStore?.slug ? (
          <Link
            href={`/stores/${showStore.slug}`}
            onClick={onNavigate}
            aria-label={`متجر ${showStore.name ?? ''}`}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pe-3 ps-1.5 text-white backdrop-blur transition hover:bg-white/20"
          >
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
              {showStore.logo_url ? (
                <Image src={showStore.logo_url} alt={showStore.name ?? ''} fill sizes="36px" className="object-cover" />
              ) : (
                <StoreIcon size={16} className="text-luxor-goldlight" />
              )}
            </span>
            {showStore.name && (
              <span className="max-w-[40vw] truncate text-xs font-bold">{showStore.name}</span>
            )}
          </Link>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums text-white/85 backdrop-blur">
            {active + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* الكاروسيل ثلاثي الأبعاد */}
      <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center">
        <Swiper
          modules={[EffectCoverflow, Keyboard, Mousewheel, A11y]}
          dir="ltr"
          effect="coverflow"
          grabCursor
          centeredSlides
          slidesPerView="auto"
          initialSlide={active}
          loop={items.length > 2}
          speed={520}
          keyboard={{ enabled: true }}
          mousewheel={{ forceToAxis: true, sensitivity: 0.6 }}
          coverflowEffect={{
            rotate: 32,
            stretch: 0,
            depth: 240,
            modifier: 1,
            slideShadows: false,
            scale: 0.82,
          }}
          onSwiper={(sw) => {
            swiperRef.current = sw;
          }}
          onSlideChange={(sw) => {
            setActive(sw.realIndex);
            onIndexChange(sw.realIndex);
          }}
          className="lsm-cf-swiper w-full"
        >
          {items.map(({ key, img, product }) => (
            <SwiperSlide key={key} className="lsm-cf-slide">
              <div className="lsm-cf-card relative overflow-hidden rounded-[26px] bg-luxor-obsidian shadow-2xl ring-1 ring-white/10">
                {img && (
                  <Image
                    src={img}
                    alt={product.title}
                    fill
                    sizes="(max-width:768px) 86vw, 60vw"
                    className="object-contain select-none"
                    draggable={false}
                    priority
                  />
                )}
                {/* تدرّج سفلي + عنوان ووصف */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 pt-12">
                  <h3 className="line-clamp-2 text-lg font-black text-white drop-shadow">
                    {product.title}
                  </h3>
                  {product.store?.name && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/75">
                      <StoreIcon size={12} className="text-luxor-goldlight" /> {product.store.name}
                    </p>
                  )}
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* أسهم التنقّل على الحافتين */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="السابق"
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute start-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 hover:scale-105 active:scale-95 md:start-6"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              aria-label="التالي"
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute end-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 hover:scale-105 active:scale-95 md:end-6"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* زر «عرض المنتج» + نقاط الترقيم */}
      <div className="relative z-10 flex flex-col items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {current && (
          <Link
            href={`/products/${current.product.id}`}
            onClick={onNavigate}
            className="inline-flex items-center gap-1.5 rounded-full bg-luxor-gold px-5 py-2.5 text-sm font-bold text-luxor-obsidian shadow-lg transition hover:bg-luxor-goldlight active:scale-95"
          >
            <ExternalLink size={16} /> عرض المنتج
          </Link>
        )}

        {items.length > 1 && (
          <div className="flex max-w-[80vw] flex-wrap items-center justify-center gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.key}
                type="button"
                aria-label={`اذهب للشريحة ${i + 1}`}
                aria-current={i === active}
                onClick={() => swiperRef.current?.slideToLoop(i)}
                className={`lsm-cf-dot h-1.5 rounded-full transition-all ${
                  i === active ? 'w-6 bg-luxor-gold' : 'w-1.5 bg-white/35 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(view, document.body);
}
