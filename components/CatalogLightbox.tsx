'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Store as StoreIcon, ExternalLink } from 'lucide-react';
import Lightbox, {
  type SlideImage,
  type RenderSlideProps,
  type Slide,
} from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

import type { ProductWithStore, Store } from '@/lib/types';

type CatalogSlide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/** شريحة Lightbox موسّعة تحمل بيانات المنتج معها لاستخدامها في العرض المخصّص. */
type ProductSlide = SlideImage & {
  productId: string;
  productTitle: string;
};

/**
 * صورة شريحة مخصّصة تعتمد next/image — تملأ عرض الشاشة بالكامل على الجوال
 * (object-contain يحافظ على النسبة لكن بعرض كامل بلا حواف جانبية). الضغط
 * مخصّص للتكبير (لا يفتح المنتج بالنقر حتى لا يتعارض مع النقر المزدوج).
 */
function NextSlide({ slide }: RenderSlideProps) {
  const s = slide as ProductSlide;
  if (!s.src) return null;
  return (
    <div className="relative h-full w-full">
      <Image
        src={s.src}
        alt={s.alt ?? ''}
        fill
        sizes="100vw"
        className="object-contain select-none"
        draggable={false}
        priority
      />
    </div>
  );
}

/**
 * CatalogLightbox — عارض كتالوج بملء الشاشة أنيق وسلس وطبيعي، مبني على
 * مكتبة yet-another-react-lightbox:
 *
 *  • سحب طبيعي صورة-صورة (لا قفزات عشوائية)، زخم سلس، إغلاق بالسحب لأسفل.
 *  • الصورة تملأ عرض الشاشة بالكامل على الجوال (ليست بحجم مصغّرة).
 *  • تكبير بالنقر المزدوج / القرص (Zoom plugin).
 *  • شريط مصغّرات أسفل العرض (Thumbnails plugin) + عدّاد (Counter plugin).
 *  • زوايا خفيفة الاستدارة (أقرب للحادّة).
 *  • لوجو متجر المنتج الحالي أعلى اليسار، وزر «المنتج» أسفل اليسار.
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
  const lbSlides = useMemo<ProductSlide[]>(
    () =>
      slides
        .filter((s) => !!s.img)
        .map((s) => ({
          src: s.img as string,
          alt: s.product.title,
          productId: String(s.product.id),
          productTitle: s.product.title,
        })),
    [slides]
  );

  // معرّف منتج الشريحة الحالية (لزر «المنتج»).
  const current = lbSlides[Math.min(index, lbSlides.length - 1)];

  if (!lbSlides.length) return null;

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={lbSlides as unknown as Slide[]}
      on={{
        view: ({ index: i }) => onIndexChange(i),
      }}
      plugins={[Zoom, Thumbnails, Counter]}
      className="lsm-lightbox"
      // حركات سلسة وطبيعية.
      animation={{ fade: 250, swipe: 420, easing: { swipe: 'cubic-bezier(0.22, 1, 0.36, 1)' } }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      // عرض كامل على الجوال: بلا حشو ومسافة صغيرة بين الشرائح.
      carousel={{ finite: false, padding: 0, spacing: 12, imageFit: 'contain' }}
      zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 250, scrollToZoom: true }}
      counter={{ container: { style: { top: 'max(0.75rem, env(safe-area-inset-top))', left: '50%', transform: 'translateX(-50%)', bottom: 'unset' } } }}
      thumbnails={{
        position: 'bottom',
        width: 64,
        height: 64,
        border: 2,
        borderRadius: 8,
        padding: 4,
        gap: 8,
        imageFit: 'cover',
      }}
      styles={{
        root: {
          '--yarl__color_backdrop': 'rgba(10, 10, 10, 0.98)',
          '--yarl__thumbnails_thumbnail_active_border_color': '#D4AF37',
          '--yarl__thumbnails_container_background_color': 'rgba(10,10,10,0.85)',
          '--yarl__counter_color': 'rgba(255,255,255,0.85)',
        },
      }}
      render={{
        slide: NextSlide,
        // رأس مخصّص: لوجو متجر المنتج الحالي أعلى اليسار.
        slideHeader: () =>
          activeStore?.slug ? (
            <Link
              href={`/stores/${activeStore.slug}`}
              onClick={onNavigate}
              aria-label={`متجر ${activeStore.name ?? ''}`}
              className="group pointer-events-auto absolute top-[max(0.75rem,env(safe-area-inset-top))] start-3 z-[1] inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 py-1.5 pe-3 ps-1.5 text-white backdrop-blur transition hover:bg-white/20"
            >
              <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15">
                {activeStore.logo_url ? (
                  <Image src={activeStore.logo_url} alt={activeStore.name ?? ''} fill sizes="36px" className="object-cover" />
                ) : (
                  <StoreIcon size={16} className="text-luxor-goldlight" />
                )}
              </span>
              {activeStore.name && (
                <span className="max-w-[40vw] truncate text-xs font-bold">{activeStore.name}</span>
              )}
            </Link>
          ) : null,
        // تذييل مخصّص: زر «عرض المنتج» أسفل اليسار.
        slideFooter: () =>
          current ? (
            <Link
              href={`/products/${current.productId}`}
              onClick={onNavigate}
              className="pointer-events-auto absolute bottom-[calc(64px+max(1rem,env(safe-area-inset-bottom)))] start-3 z-[1] inline-flex items-center gap-1.5 rounded-full bg-luxor-gold/90 px-3.5 py-2 text-xs font-bold text-luxor-obsidian shadow-lg backdrop-blur transition hover:bg-luxor-gold"
            >
              <ExternalLink size={14} /> عرض المنتج
            </Link>
          ) : null,
      }}
    />
  );
}
