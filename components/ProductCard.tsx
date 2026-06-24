'use client';

import Link from 'next/link';
import { Eye, Store as StoreIcon, Tag, MapPin, BadgeCheck, Zap, CalendarClock } from 'lucide-react';
import CroppedImage from './CroppedImage';
import ShareButton from './ShareButton';
import { useLocale } from './LocaleProvider';
import { deliveryDaysLabel, discountPercent, buildWhatsAppLink, absoluteUrl } from '@/lib/utils';
import type { ProductWithStore } from '@/lib/types';

export default function ProductCard({ product }: { product: ProductWithStore }) {
  const { locale, t } = useLocale();
  const img = product.images?.[0];
  const imgCrop = product.images_meta?.[0] ?? null;
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
    // الكارت لم يعد <Link> كاملاً: الصورة والنصوص روابط منفصلة، بينما شريط
    // الإجراءات (واتساب/مشاركة) خارج أي رابط — حتى لا نُداخل عناصر تفاعلية
    // (زر المشاركة) داخل <a> (HTML غير صالح) ولا تتعارض الأحداث.
    <div className="group block animate-fade-in h-full">
      {/* Golden metal outer border */}
      <div className="relative bg-gold-metal p-[2px] rounded-2xl shadow-sm group-hover:shadow-luxor-lg transition-all duration-300 h-full">
        {/* Creamy marble inner card */}
        <div className="relative bg-marble rounded-[14px] overflow-hidden flex flex-col h-full">
          {/* ── Clean image: no badges covering it ── */}
          <Link
            href={href}
            className="aspect-square relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-black block"
          >
            {img ? (
              <span className="absolute inset-0 block group-hover:scale-110 transition-transform duration-700 ease-out">
                <CroppedImage
                  src={img}
                  crop={imgCrop}
                  alt={product.title}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </span>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-gold/40">
                <StoreIcon size={56} />
              </div>
            )}

            {/* golden hairline under the image */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />

            {/* "unavailable" overlay is the only allowed cover — it must block the product visually */}
            {!product.is_available && (
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center">
                <span className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-bold shadow">
                  {t.product.unavailable}
                </span>
              </div>
            )}
          </Link>

          {/* ── Badges strip BELOW the image (not covering it) ── */}
          <div className="flex items-center gap-1.5 flex-wrap px-3 pt-2.5">
            {pct !== null && (
              <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm" dir="ltr">
                -{pct}%
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                isPreorder
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}
            >
              {isPreorder ? <CalendarClock size={11} /> : <Zap size={11} />}
              {isPreorder
                ? product.delivery_days
                  ? deliveryDaysLabel(product.delivery_days, locale)
                  : t.product.preorder
                : t.product.instantDelivery}
            </span>
            {product.brand && (
              <span className="bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {product.brand}
              </span>
            )}
            {product.category && (
              <span className="bg-luxor-sandlight border border-luxor-sand px-2 py-0.5 rounded-full text-[10px] font-semibold text-luxor-navy/70">
                <span className="me-0.5">{product.category.icon}</span>
                {locale === 'ar' ? product.category.name_ar : product.category.name_en}
              </span>
            )}
            <span className="ms-auto text-luxor-navy/45 text-[10px] font-medium inline-flex items-center gap-1">
              <Eye size={11} /> {product.views ?? 0}
            </span>
          </div>

          <div className="p-3.5 sm:p-4 pt-2 flex flex-col flex-1">
            <Link href={href} className="block">
              <h3 className="font-bold text-luxor-obsidian line-clamp-2 mb-1.5 min-h-[2.6rem] text-sm sm:text-base leading-snug group-hover:text-luxor-darkgold transition">
                {product.title}
              </h3>
            </Link>

            {product.store && (
              <div className="text-[11px] sm:text-xs text-luxor-obsidian/60 mb-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 max-w-full truncate">
                  <StoreIcon size={12} className="text-luxor-darkgold shrink-0" />
                  <span className="truncate">{product.store.name}</span>
                  {product.store.is_verified && (
                    <BadgeCheck size={12} className="text-luxor-darkgold shrink-0" />
                  )}
                </span>
                {product.store.city && (
                  <span className="inline-flex items-center gap-0.5 text-luxor-obsidian/45">
                    <MapPin size={11} />
                    <span className="truncate">{product.store.city}</span>
                  </span>
                )}
              </div>
            )}

            {/* ── منطقة الإجراءات ──
               Mobile: زر "استعلم عن السعر" يأخذ صفّاً كاملاً بمفرده، ثم صفّ
               ثانٍ منظَّم يضمّ واتساب + مشاركة بعرضٍ متساوٍ. على الشاشات الأكبر
               (sm+) يعودان لصفٍّ واحد مدمج مع أزرار أيقونية مربّعة. */}
            <div className="mt-auto pt-2 border-t border-luxor-gold/25 flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <Link
                href={href}
                className="inline-flex flex-1 items-center justify-center gap-1.5 text-sm font-bold text-luxor-goldlight bg-luxor-obsidian border border-luxor-gold/50 px-3 py-2 rounded-xl group-hover:bg-gold-gradient group-hover:text-luxor-obsidian group-hover:border-luxor-gold transition shadow-sm"
              >
                <Tag size={14} />
                {t.product.askPrice}
              </Link>

              {/* صفّ الأزرار الثانوية: واتساب + مشاركة */}
              <div className="flex items-stretch gap-2">
                {waLink && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={t.product.whatsappOrder}
                    title={t.product.whatsappOrder}
                    onClick={(e) => {
                      // نفتح واتساب مباشرة بدون أي تنقّل
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(waLink, '_blank', 'noopener,noreferrer');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(waLink, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    className="inline-flex flex-1 sm:flex-none sm:w-11 items-center justify-center gap-1.5 px-3 sm:px-0 py-2 rounded-xl bg-[#25D366] text-white border border-[#1da851] shadow-sm transition hover:bg-[#1ebe5d] active:scale-95"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
                      <path d="M20.52 3.48A11.94 11.94 0 0012.04 0C5.49 0 .15 5.34.15 11.91c0 2.1.55 4.15 1.6 5.96L0 24l6.27-1.64a11.92 11.92 0 005.77 1.47h.01c6.56 0 11.9-5.34 11.9-11.91 0-3.18-1.24-6.17-3.43-8.44zM12.05 21.8h-.01a9.86 9.86 0 01-5.02-1.38l-.36-.21-3.72.98 1-3.63-.24-.37a9.84 9.84 0 01-1.51-5.28c0-5.45 4.44-9.89 9.89-9.89 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 012.9 6.99c0 5.45-4.44 9.89-9.92 9.89zm5.43-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.41-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47 0 1.46 1.07 2.87 1.22 3.07.15.2 2.11 3.22 5.1 4.51.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/>
                    </svg>
                    <span className="sm:hidden font-bold text-sm">{t.product.whatsappOrder}</span>
                  </span>
                )}

                {/* زر المشاركة — نمنع تنقّل الرابط الأب عند الضغط */}
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="inline-flex shrink-0 items-center"
                >
                  <ShareButton
                    variant="icon"
                    menuPlacement="up"
                    path={href}
                    title={product.title}
                    text={product.title}
                    label={t.common.shareProduct}
                    className="inline-flex items-center justify-center w-11 h-full min-h-[2.5rem] rounded-xl bg-white border border-luxor-gold/50 text-luxor-darkgold hover:bg-luxor-gold/10 transition shadow-sm"
                  />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
