'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, LogIn, MessageCircle, HandCoins } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from './LocaleProvider';
import {
  buildWhatsAppLink,
  formatPrice,
  discountPercent,
  depositAmount,
  deliveryDaysLabel,
} from '@/lib/utils';
import { VARIANT_EVENT, type VariantSelection } from './ProductVariants';
import type { FulfillmentOption, ProductColor, ProductSize } from '@/lib/types';

/** تسميات خيارات الاستلام لرسالة الواتساب */
const FULFILLMENT_LABELS: Record<FulfillmentOption, string> = {
  delivery: 'توصيل',
  store_pickup: 'استلام من المتجر',
  address_pickup: 'استلام من عنوان',
};

// sessionStorage key used to remember a one-shot auto-reveal request that
// survives the login redirect. We deliberately do NOT use the URL for this so
// that history navigation (back/forward) or bookmarks cannot accidentally
// trigger a price reveal on a different product/session.
const PENDING_REVEAL_KEY = 'lsm:pendingReveal';

export default function PriceReveal({
  productId,
  productTitle,
  price,
  compareAtPrice,
  storeWhatsapp,
  storeName,
  isAvailable,
  depositType,
  depositValue,
  deliveryType,
  deliveryDays,
  sizes,
  colors,
  categoryName,
  brand,
  fulfillmentOptions,
  pickupAddress,
}: {
  productId: string;
  productTitle: string;
  price: number;
  /** السعر قبل الخصم (اختياري) */
  compareAtPrice?: number | null;
  storeWhatsapp: string;
  storeName: string;
  isAvailable: boolean;
  /** الدفع المقدم (العربون) */
  depositType?: 'none' | 'percent' | 'amount' | null;
  depositValue?: number | null;
  deliveryType?: 'instant' | 'preorder' | null;
  deliveryDays?: number | null;
  sizes?: ProductSize[] | null;
  colors?: ProductColor[] | null;
  categoryName?: string | null;
  /** اسم البراند (اختياري) */
  brand?: string | null;
  /** خيارات الاستلام المتاحة للمنتج */
  fulfillmentOptions?: FulfillmentOption[] | null;
  /** العنوان عند توفر "استلام من عنوان" */
  pickupAddress?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLocale();

  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  // المقاس/اللون المختاران في <ProductVariants/> — يُبلّغان عبر حدث مخصص
  const [selection, setSelection] = useState<VariantSelection>({ size: null, color: null });

  useEffect(() => {
    const onVariant = (e: Event) => {
      const detail = (e as CustomEvent<VariantSelection>).detail;
      if (detail) setSelection(detail);
    };
    window.addEventListener(VARIANT_EVENT, onVariant);
    return () => window.removeEventListener(VARIANT_EVENT, onVariant);
  }, []);

  // 1) Resolve current auth state on mount + react to auth state changes.
  //    Also re-check whenever the page is restored from the BFCache (mobile
  //    Chrome aggressively caches pages on back/forward — without this the
  //    revealed price could leak across sessions).
  useEffect(() => {
    let cancelled = false;

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(data.user);
      setChecking(false);
      // If the session was cleared (logout/expiry) while the page was in the
      // BFCache, force the price back behind the login wall.
      if (!data.user) setRevealed(false);
    };

    void checkUser();

    // React to login/logout that happens in another tab.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (!session?.user) setRevealed(false);
    });

    const onPageShow = (e: PageTransitionEvent) => {
      // Only re-fetch when the page was restored from BFCache
      // (`persisted === true`). On a normal navigation we already have fresh
      // state from the mount effect.
      if (e.persisted) {
        void checkUser();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkUser();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [supabase]);

  // 2) IMPORTANT: do NOT auto-reveal based on the URL. Price reveal must be
  //    an explicit user action. The only allowed auto-reveal path is the
  //    sessionStorage one-shot flag set right before redirecting to /login,
  //    and it must match the CURRENT productId.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (checking) return; // wait until auth resolved
    if (!user) return; // never auto-reveal for guests
    if (revealed) return;

    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_REVEAL_KEY);
    } catch {
      // sessionStorage might be unavailable (privacy mode); just skip auto-reveal
      pending = null;
    }

    if (pending && pending === productId) {
      // consume the flag immediately so it can never fire twice or leak to
      // another product page.
      try {
        sessionStorage.removeItem(PENDING_REVEAL_KEY);
      } catch {
        /* ignore */
      }
      // Also strip any legacy ?showPrice=1 query that may still be in the URL
      // from an older deployment.
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('showPrice')) {
          url.searchParams.delete('showPrice');
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        /* ignore */
      }
      // Fire the reveal (tracks the inquiry server-side, then shows the price).
      void doReveal();
    } else {
      // Defensive cleanup: legacy ?showPrice=1 must NEVER auto-reveal on its own.
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('showPrice')) {
          url.searchParams.delete('showPrice');
          window.history.replaceState({}, '', url.toString());
        }
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checking, productId]);

  const doReveal = async () => {
    setLoading(true);
    try {
      // log inquiry (don't block UI if it fails)
      await supabase.rpc('track_price_inquiry', { p_product_id: productId });
    } catch {
      /* ignore */
    }
    setRevealed(true);
    setLoading(false);
  };

  const handleReveal = async () => {
    if (!user) {
      // Remember which product the user wanted to reveal, then send them to
      // login. We pin this to the productId so it can ONLY auto-reveal for
      // the same product after a successful login.
      try {
        sessionStorage.setItem(PENDING_REVEAL_KEY, productId);
      } catch {
        /* ignore */
      }
      const next = encodeURIComponent(`/products/${productId}`);
      router.push(`/login?next=${next}`);
      return;
    }
    await doReveal();
  };

  const handleOrder = async () => {
    if (!user) {
      try {
        sessionStorage.setItem(PENDING_REVEAL_KEY, productId);
      } catch {
        /* ignore */
      }
      const next = encodeURIComponent(`/products/${productId}`);
      router.push(`/login?next=${next}`);
      return;
    }
    // log order
    try {
      await supabase.rpc('track_order', { p_product_id: productId });
    } catch {
      /* ignore */
    }

    // ── رسالة واتساب كاملة التفاصيل للبائع ──
    const pctMsg = discountPercent(price, compareAtPrice);
    const depositAmt = depositAmount(price, depositType, depositValue);
    const lines: string[] = [];

    lines.push(`مرحباً، أرغب في طلب المنتج التالي من متجر "${storeName}":`);
    lines.push('');
    lines.push(`🛍️ *${productTitle}*`);
    if (brand) lines.push(`🏷️ البراند: ${brand}`);
    if (categoryName) lines.push(`📂 القسم: ${categoryName}`);
    lines.push('');

    // السعر + الخصم
    if (pctMsg !== null && compareAtPrice) {
      lines.push(`💰 السعر: ${formatPrice(price)} ج.م (بدلاً من ${formatPrice(compareAtPrice)} ج.م)`);
      lines.push(`🏷️ خصم: ${pctMsg}% — توفير ${formatPrice(compareAtPrice - price)} ج.م`);
    } else {
      lines.push(`💰 السعر: ${formatPrice(price)} ج.م`);
    }

    // الدفع المقدم (العربون)
    if (depositAmt !== null) {
      const depositDesc =
        depositType === 'percent'
          ? `${depositValue}% = ${formatPrice(depositAmt)} ج.م`
          : `${formatPrice(depositAmt)} ج.م`;
      lines.push(`💳 الدفع المقدم (عربون): ${depositDesc}`);
      lines.push(`💵 المتبقي عند الاستلام: ${formatPrice(price - depositAmt)} ج.م`);
    }

    // المقاس واللون المختاران (أو المتاح منهما لو لم يختر العميل)
    const availableSizes = (sizes ?? []).filter(
      (s) => s.available && !(typeof s.qty === 'number' && s.qty <= 0)
    );
    const availableColors = (colors ?? []).filter((c) => c.available !== false);
    if (selection.size) {
      lines.push(`📏 المقاس المطلوب: ${selection.size}`);
    } else if (availableSizes.length) {
      lines.push(`📏 المقاسات المتاحة: ${availableSizes.map((s) => s.name).join('، ')} (لم أحدد بعد)`);
    }
    if (selection.color) {
      lines.push(`🎨 اللون المطلوب: ${selection.color}`);
    } else if (availableColors.length) {
      lines.push(`🎨 الألوان المتاحة: ${availableColors.map((c) => c.name).join('، ')} (لم أحدد بعد)`);
    }

    // طريقة التوفر
    if (deliveryType === 'preorder') {
      lines.push(
        `⏳ التوفر: حجز مسبق${deliveryDays ? ` — ${deliveryDaysLabel(deliveryDays, 'ar')}` : ''}`
      );
    } else {
      lines.push('⚡ التوفر: متاح فوراً');
    }

    // خيارات الاستلام المتاحة
    if (fulfillmentOptions?.length) {
      const labels = fulfillmentOptions
        .filter((o): o is FulfillmentOption => o in FULFILLMENT_LABELS)
        .map((o) =>
          o === 'address_pickup' && pickupAddress
            ? `${FULFILLMENT_LABELS[o]} (${pickupAddress})`
            : FULFILLMENT_LABELS[o]
        );
      if (labels.length) {
        lines.push(`📦 خيارات الاستلام: ${labels.join(' / ')}`);
      }
    }

    lines.push('');
    lines.push(`🔗 رابط المنتج: ${window.location.origin}/products/${productId}`);

    const link = buildWhatsAppLink(storeWhatsapp, lines.join('\n'));
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (checking) {
    return (
      <div className="card p-6 mb-6 bg-gradient-to-br from-luxor-sandlight to-white text-center text-luxor-navy/60">
        {t.common.loading}
      </div>
    );
  }

  // Defensive: never show the price unless we have BOTH a confirmed user
  // and an explicit reveal in this session. This survives BFCache restores.
  if (!revealed || !user) {
    return (
      <div className="card p-6 mb-6 bg-gradient-to-br from-luxor-sandlight to-white">
        <div className="text-sm text-luxor-navy/70 mb-3">{t.product.price}</div>
        <button
          onClick={handleReveal}
          disabled={loading}
          className="btn-primary w-full !text-base !py-4 disabled:opacity-60"
        >
          {!user ? <LogIn size={20} /> : <Tag size={20} />}
          {loading
            ? t.product.revealing
            : !user
              ? t.product.loginToSeePrice
              : t.product.askPrice}
        </button>
        {!user && (
          <p className="text-xs text-luxor-navy/60 mt-3 text-center">
            {locale === 'ar'
              ? 'سجّل دخولك مرة واحدة لتتمكن من رؤية الأسعار وإرسال الطلبات.'
              : 'Log in once to see prices and place orders.'}
          </p>
        )}
      </div>
    );
  }

  // Revealed: show price (+ discount when present) + order button
  const pct = discountPercent(price, compareAtPrice);
  const depAmt = depositAmount(price, depositType, depositValue);

  return (
    <div className="space-y-3 mb-6">
      <div className="card p-6 bg-gradient-to-br from-luxor-sandlight to-white animate-fade-in">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-luxor-navy/70">{t.product.price}</span>
          {pct !== null && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full" dir="ltr">
              -{pct}%
            </span>
          )}
        </div>
        <div className="text-4xl md:text-5xl font-bold text-luxor-gold">
          {formatPrice(price, locale)}
          <span className="text-xl text-luxor-navy/60 ms-2">
            {locale === 'ar' ? 'ج.م' : 'EGP'}
          </span>
        </div>
        {pct !== null && compareAtPrice && (
          <div className="mt-1 text-luxor-navy/50">
            <span className="line-through text-lg">
              {formatPrice(compareAtPrice, locale)} {locale === 'ar' ? 'ج.م' : 'EGP'}
            </span>
            <span className="text-sm text-emerald-700 font-semibold ms-3">
              {locale === 'ar'
                ? `وفّرت ${formatPrice(compareAtPrice - price, locale)} ج.م`
                : `You save ${formatPrice(compareAtPrice - price, locale)} EGP`}
            </span>
          </div>
        )}

        {/* الدفع المقدم (العربون) */}
        {depAmt !== null && (
          <div className="mt-3 flex items-center gap-2.5 bg-luxor-gold/10 border border-luxor-gold/40 rounded-xl p-3">
            <span className="w-9 h-9 rounded-full bg-luxor-gold text-luxor-obsidian flex items-center justify-center shrink-0">
              <HandCoins size={18} />
            </span>
            <div className="text-sm">
              <div className="font-bold text-luxor-navy">
                {locale === 'ar' ? 'دفع مقدم (عربون)' : 'Deposit required'}
                {': '}
                <span className="text-luxor-darkgold">
                  {depositType === 'percent'
                    ? `${depositValue}% = ${formatPrice(depAmt, locale)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`
                    : `${formatPrice(depAmt, locale)} ${locale === 'ar' ? 'ج.م' : 'EGP'}`}
                </span>
              </div>
              <div className="text-xs text-luxor-navy/60 mt-0.5">
                {locale === 'ar'
                  ? `المتبقي عند الاستلام: ${formatPrice(price - depAmt, locale)} ج.م`
                  : `Remaining on delivery: ${formatPrice(price - depAmt, locale)} EGP`}
              </div>
            </div>
          </div>
        )}
      </div>

      {isAvailable && (
        <button
          onClick={handleOrder}
          className="btn-whatsapp w-full !text-base !py-4"
        >
          <MessageCircle size={20} />
          {locale === 'ar' ? 'اطلب الآن عبر واتساب' : 'Order now via WhatsApp'}
        </button>
      )}
      {isAvailable && (
        <p className="text-xs text-center text-luxor-navy/60">
          {locale === 'ar'
            ? 'ستتواصل مباشرة مع البائع لإتمام الطلب والدفع والتسليم'
            : 'You will contact the seller directly to complete the order, payment and delivery'}
        </p>
      )}
    </div>
  );
}
