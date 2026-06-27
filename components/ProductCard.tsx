'use client';

import Link from 'next/link';
import { Eye, Store as StoreIcon, Tag, BadgeCheck, Zap, CalendarClock } from 'lucide-react';
import ProductCardGallery from './ProductCardGallery';
import ShareButton from './ShareButton';
import { useLocale } from './LocaleProvider';
import { deliveryDaysLabel, discountPercent, buildWhatsAppLink, absoluteUrl } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

export default function ProductCard({ product }: { product: ProductWithStore }) {
  const { locale, t } = useLocale();
  const isPreorder = product.delivery_type === 'preorder';
  const pct = discountPercent(product.price, product.compare_at_price);

  // رقم واتساب البائع (إن وُجد) لزر الاستفسار السريع داخل الكارت
  const whatsapp = product.store?.whatsapp;
  const waLink = whatsapp
    ? buildWhatsAppLink(
        whatsapp,
        [
          locale === 'ar'
            ? `مرحباً، أستفسر عن سعر المنتج التالي${product.store?.name ? ` من متجر "${product.store.name}"` : ''}:`
            : `Hello, I'd like to ask about the price of this product${product.store?.name ? ` from "${product.store.name}"` : ''}:`,
          '',
          `🛍️ ${product.title}`,
          `🔗 ${absoluteUrl(`/products/${product.id}`)}`,
        ].join('\n')
      )
    : null;

  const href = `/products/${product.id}`;

  return (
    <div className="group block h-full animate-fade-in">
      {/* Golden metal outer border */}
      <div className="relative h-full rounded-2xl bg-gold-metal p-[1.5px] shadow-sm transition-all duration-300 group-hover:shadow-luxor-lg">
        {/* Creamy marble inner card */}
        <div className="relative flex h-full flex-col overflow-hidden rounded-[14px] bg-marble">
          {/* ── معرض صور قابل للسحب ── */}
          <div className="relative">
            <ProductCardGallery
              images={product.images ?? []}
              meta={product.images_meta}
              alt={product.title}
              href={href}
              available={product.is_available}
              unavailableLabel={t.product.unavailable}
            />
            {/* شارة الخصم فوق الصورة (أقل تشويشاً) */}
            {pct !== null && (
              <span
                className="absolute start-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm"
                dir="ltr"
              >
                -{pct}%
              </span>
            )}
          </div>

          {/* ── محتوى مُصغّر ── */}
          <div className="flex flex-1 flex-col p-2.5 sm:p-3">
            {/* شارة التوصيل + المشاهدات */}
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${
                  isPreorder
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                }`}
              >
                {isPreorder ? <CalendarClock size={10} /> : <Zap size={10} />}
                {isPreorder
                  ? product.delivery_days
                    ? deliveryDaysLabel(product.delivery_days, locale)
                    : t.product.preorder
                  : t.product.instantDelivery}
              </span>
              <span className="ms-auto inline-flex items-center gap-1 text-[10px] font-medium text-luxor-navy/45">
                <Eye size={11} /> {product.views ?? 0}
              </span>
            </div>

            {/* البراند — في سطر مستقل */}
            {product.brand && (
              <div className="mb-1.5">
                <span className="inline-flex max-w-full items-center truncate rounded-full border border-luxor-gold/40 bg-luxor-obsidian px-2 py-0.5 text-[10px] font-bold text-luxor-goldlight">
                  <span className="truncate">{product.brand}</span>
                </span>
              </div>
            )}

            {/* العنوان */}
            <Link href={href} className="block">
              <h3 className="mb-1 line-clamp-2 min-h-[2.4rem] text-[13px] font-bold leading-snug text-luxor-obsidian transition group-hover:text-luxor-darkgold sm:text-sm">
                {product.title}
              </h3>
            </Link>

            {/* المتجر */}
            {product.store && (
              <Link
                href={`/stores/${product.store.slug}`}
                className="mb-2 inline-flex max-w-full items-center gap-1 truncate text-[11px] text-luxor-obsidian/55 hover:text-luxor-darkgold"
              >
                <StoreIcon size={11} className="shrink-0 text-luxor-darkgold" />
                <span className="truncate">{product.store.name}</span>
                {product.store.is_verified && (
                  <BadgeCheck size={11} className="shrink-0 text-luxor-darkgold" />
                )}
              </Link>
            )}

            {/* ── شريط الإجراءات: كلها أيقونات بعرض متساوٍ ── */}
            <div
              className={`mt-auto grid gap-1.5 pt-1.5 ${waLink ? 'grid-cols-3' : 'grid-cols-2'}`}
            >
              {/* استعلم عن السعر — أيقونة فقط (الزر الأساسي) */}
              <Link
                href={href}
                aria-label={t.product.askPrice}
                title={t.product.askPrice}
                className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-luxor-gold/50 bg-luxor-obsidian text-luxor-goldlight shadow-sm transition group-hover:border-luxor-gold group-hover:bg-gold-gradient group-hover:text-luxor-obsidian"
              >
                <Tag size={16} />
              </Link>

              {/* واتساب — أيقونة فقط */}
              {waLink && (
                <button
                  type="button"
                  aria-label={t.product.whatsappOrder}
                  title={t.product.whatsappOrder}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(waLink, '_blank', 'noopener,noreferrer');
                  }}
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[#1da851] bg-[#25D366] text-white shadow-sm transition hover:bg-[#1ebe5d] active:scale-95"
                >
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden>
                    <path d="M20.52 3.48A11.94 11.94 0 0012.04 0C5.49 0 .15 5.34.15 11.91c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.92 11.92 0 005.77 1.47h.01c6.56 0 11.9-5.34 11.9-11.91 0-3.18-1.24-6.17-3.43-8.44zM12.05 21.8h-.01a9.86 9.86 0 01-5.02-1.38l-.36-.21-3.72.98 1-3.63-.24-.37a9.84 9.84 0 01-1.51-5.28c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.9 6.99c0 5.45-4.44 9.89-9.92 9.89zm5.43-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.41-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.07 2.87 1.22 3.07.15.2 2.11 3.22 5.1 4.51.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z" />
                  </svg>
                </button>
              )}

              {/* مشاركة — أيقونة فقط */}
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="block w-full [&>div]:block [&>div]:w-full"
              >
                <ShareButton
                  variant="icon"
                  menuPlacement="up"
                  path={href}
                  title={product.title}
                  text={product.title}
                  label={t.common.shareProduct}
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-luxor-gold/50 bg-white text-luxor-darkgold shadow-sm transition hover:bg-luxor-gold/10"
                />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
