'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, LogIn, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from './LocaleProvider';
import { buildWhatsAppLink, formatPrice } from '@/lib/utils';

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setChecking(false);
    });
  }, [supabase]);

  const handleReveal = async () => {
    if (!user) {
      const next = encodeURIComponent(`/products/${productId}?showPrice=1`);
      router.push(`/login?next=${next}`);
      return;
    }
    setLoading(true);
    // log inquiry (don't block UI if it fails)
    await supabase.rpc('track_price_inquiry', { p_product_id: productId });
    setRevealed(true);
    setLoading(false);
  };

  // If user lands with ?showPrice=1 after login and is authed, auto-reveal once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('showPrice') === '1' && user && !revealed) {
      handleReveal();
      // clean query
      url.searchParams.delete('showPrice');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOrder = async () => {
    if (!user) {
      const next = encodeURIComponent(`/products/${productId}?showPrice=1`);
      router.push(`/login?next=${next}`);
      return;
    }
    // log order
    await supabase.rpc('track_order', { p_product_id: productId });

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
            سجّل دخولك مرة واحدة لتتمكن من رؤية الأسعار وإرسال الطلبات.
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
          اطلب الآن عبر واتساب
        </button>
      )}
      {isAvailable && (
        <p className="text-xs text-center text-luxor-navy/60">
          ستتواصل مباشرة مع البائع لإتمام الطلب والدفع والتسليم
        </p>
      )}
    </div>
  );
}
