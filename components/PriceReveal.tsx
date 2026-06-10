'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, LogIn, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from './LocaleProvider';
import { buildWhatsAppLink, formatPrice } from '@/lib/utils';

// sessionStorage key used to remember a one-shot auto-reveal request that
// survives the login redirect. We deliberately do NOT use the URL for this so
// that history navigation (back/forward) or bookmarks cannot accidentally
// trigger a price reveal on a different product/session.
const PENDING_REVEAL_KEY = 'lsm:pendingReveal';

export default function PriceReveal({
  productId,
  productTitle,
  price,
  storeWhatsapp,
  storeName,
  isAvailable,
}: {
  productId: string;
  productTitle: string;
  price: number;
  storeWhatsapp: string;
  storeName: string;
  isAvailable: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLocale();

  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1) Resolve current auth state on mount.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      setChecking(false);
    });
    return () => {
      cancelled = true;
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

    const msg = `السلام عليكم، أرغب في طلب المنتج التالي من متجر "${storeName}":\n\n*${productTitle}*\nالسعر: ${formatPrice(price)} ج.م\n\nرابط المنتج: ${window.location.origin}/products/${productId}`;
    const link = buildWhatsAppLink(storeWhatsapp, msg);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  if (checking) {
    return (
      <div className="card p-6 mb-6 bg-gradient-to-br from-luxor-sandlight to-white text-center text-luxor-navy/60">
        {t.common.loading}
      </div>
    );
  }

  if (!revealed) {
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

  // Revealed: show price + order button
  return (
    <div className="space-y-3 mb-6">
      <div className="card p-6 bg-gradient-to-br from-luxor-sandlight to-white animate-fade-in">
        <div className="text-sm text-luxor-navy/70 mb-1">{t.product.price}</div>
        <div className="text-4xl md:text-5xl font-bold text-luxor-gold">
          {formatPrice(price, locale)}
          <span className="text-xl text-luxor-navy/60 ms-2">
            {locale === 'ar' ? 'ج.م' : 'EGP'}
          </span>
        </div>
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
