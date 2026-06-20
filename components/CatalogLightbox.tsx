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
import { Keyboard, Mousewheel, A11y } from 'swiper/modules';
import 'swiper/css';

import type { ProductWithStore, Store } from '@/lib/types';

type CatalogSlide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * CatalogLightbox — عارض كتالوج بملء الشاشة، بسيط وأنيق واحترافي:
 *
 *  • شريحة واحدة في كل مرّة (slidesPerView=1) بانتقال انزلاقي سلس وهادئ.
 *  • الصورة تحترم نسبتها الأصلية (object-contain) داخل خلفية داكنة فاخرة.
 *  • أسهم تنقّل على الحافتين، عدّاد أعلى اليمين، وشريط تقدّم رفيع أسفل الشاشة
 *    (سطر واحد) بدلاً من مئات النقاط — يصلح لأي عدد من الصور.
 *  • تنقّل بلوحة المفاتيح وعجلة الماوس وإغلاق بـ Esc أو النقر على الخلفية.
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
  const progress = items.length > 1 ? ((active + 1) / items.length) * 100 : 100;

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

      {/* الكاروسيل البسيط الأنيق — شريحة واحدة في كل مرّة */}
      <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-3 pb-2">
        <Swiper
          modules={[Keyboard, Mousewheel, A11y]}
          dir="ltr"
          slidesPerView={1}
          spaceBetween={24}
          initialSlide={active}
          loop={items.length > 1}
          speed={420}
          grabCursor
          keyboard={{ enabled: true }}
          mousewheel={{ forceToAxis: true, sensitivity: 0.6 }}
          onSwiper={(sw) => {
            swiperRef.current = sw;
          }}
          onSlideChange={(sw) => {
            setActive(sw.realIndex);
            onIndexChange(sw.realIndex);
          }}
          className="lsm-cf-swiper h-full w-full"
        >
          {items.map(({ key, img, product }) => (
            <SwiperSlide key={key} className="lsm-cf-slide">
              <div className="lsm-cf-card relative">
                {img && (
                  <Image
                    src={img}
                    alt={product.title}
                    fill
                    sizes="(max-width:768px) 92vw, 70vw"
                    className="object-contain select-none"
                    draggable={false}
                    priority
                  />
                )}
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
              className="absolute start-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95 md:start-6"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              type="button"
              aria-label="التالي"
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute end-2 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-black/60 active:scale-95 md:end-6"
            >
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>

      {/* العنوان + زر «عرض المنتج» + شريط تقدّم رفيع (سطر واحد) */}
      <div className="relative z-10 flex flex-col items-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {current && (
          <div className="flex w-full max-w-md flex-col items-center gap-2 text-center">
            <h3 className="line-clamp-1 text-base font-bold text-white drop-shadow">
              {current.product.title}
            </h3>
            <Link
              href={`/products/${current.product.id}`}
              onClick={onNavigate}
              className="inline-flex items-center gap-1.5 rounded-full bg-luxor-gold px-5 py-2.5 text-sm font-bold text-luxor-obsidian shadow-lg transition hover:bg-luxor-goldlight active:scale-95"
            >
              <ExternalLink size={16} /> عرض المنتج
            </Link>
          </div>
        )}

        {items.length > 1 && (
          <div
            className="lsm-cf-progress h-1 w-full max-w-[70vw] overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={items.length}
            aria-valuenow={active + 1}
          >
            <span
              className="block h-full rounded-full bg-luxor-gold transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(view, document.body);
}
