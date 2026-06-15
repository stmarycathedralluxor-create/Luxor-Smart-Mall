export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\u0600-\u06FF]/g, (c) => c) // keep arabic
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]+/g, '')
    .replace(/--+/g, '-')
    .substring(0, 50);
}

export function formatPrice(price: number, locale: 'ar' | 'en' = 'ar') {
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 2,
  });
  return formatter.format(price);
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleaned}?text=${encoded}`;
}

/* ─────────── Canonical site URL helpers ─────────── */

/**
 * The canonical base URL of the site, normalized.
 *
 * Problem this fixes: some generated/share links inconsistently started
 * with `www.` (or omitted it), producing mismatched links. We pick ONE
 * canonical form from NEXT_PUBLIC_SITE_URL and ALWAYS strip a leading
 * `www.` so every share/OG/canonical link is consistent.
 *
 * Works on both server (env) and client (window.location fallback).
 * Returns a value WITHOUT a trailing slash, e.g. "https://example.com".
 */
export function siteUrl(): string {
  let raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    'http://localhost:3000';
  raw = raw.trim().replace(/\/+$/, '');
  try {
    const u = new URL(raw);
    // Force https for any non-localhost host and drop the www. prefix so
    // links never randomly start with www.
    if (u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') {
      u.protocol = 'https:';
    }
    u.hostname = u.hostname.replace(/^www\./i, '');
    return u.origin;
  } catch {
    return raw.replace(/^(https?:\/\/)www\./i, '$1');
  }
}

/** Build an absolute URL for a site-relative path (always canonical, no www). */
export function absoluteUrl(path = '/'): string {
  const base = siteUrl();
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) {
    // Already absolute (e.g. an R2/Supabase image URL) — keep as-is.
    return path;
  }
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function timeAgo(date: string, locale: 'ar' | 'en' = 'ar'): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [number, string, string][] = [
    [31536000, 'سنة', 'year'],
    [2592000, 'شهر', 'month'],
    [86400, 'يوم', 'day'],
    [3600, 'ساعة', 'hour'],
    [60, 'دقيقة', 'minute'],
  ];
  for (const [secs, ar, en] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) {
      return locale === 'ar'
        ? `منذ ${count} ${ar}`
        : `${count} ${en}${count > 1 ? 's' : ''} ago`;
    }
  }
  return locale === 'ar' ? 'الآن' : 'just now';
}

/* ─────────── Store activation period helpers ─────────── */

export type ExpiryInfo = {
  /** null = open forever */
  expiresAt: Date | null;
  expired: boolean;
  /** whole days remaining (ceil); null when open forever */
  daysLeft: number | null;
  openForever: boolean;
};

export function getExpiryInfo(expires_at?: string | null): ExpiryInfo {
  if (!expires_at) {
    return { expiresAt: null, expired: false, daysLeft: null, openForever: true };
  }
  const expiresAt = new Date(expires_at);
  // Guard against malformed dates → treat as "open forever" instead of
  // rendering NaN/Invalid Date (which crashes downstream UI).
  if (isNaN(expiresAt.getTime())) {
    return { expiresAt: null, expired: false, daysLeft: null, openForever: true };
  }
  const ms = expiresAt.getTime() - Date.now();
  const expired = ms <= 0;
  const daysLeft = expired ? 0 : Math.ceil(ms / 86_400_000);
  return { expiresAt, expired, daysLeft, openForever: false };
}

/** Is the store publicly visible considering active/approved/expiry flags? */
export function isStoreOpen(store: {
  is_active?: boolean;
  is_approved?: boolean;
  expires_at?: string | null;
}): boolean {
  if (!store.is_active) return false;
  if (store.is_approved === false) return false;
  return !getExpiryInfo(store.expires_at).expired;
}

/* ─────────── Discount helpers ─────────── */

/**
 * نسبة الخصم المحسوبة تلقائياً من السعر قبل/بعد.
 * Returns null when there is no real discount.
 */
export function discountPercent(
  price: number,
  compareAt?: number | null
): number | null {
  if (!compareAt || compareAt <= price || price < 0) return null;
  const pct = Math.round(((compareAt - price) / compareAt) * 100);
  return pct >= 1 ? pct : null;
}

/* ─────────── Deposit (الدفع المقدم / العربون) helpers ─────────── */

/**
 * يحسب مبلغ العربون المطلوب دفعه مقدماً.
 * Returns null when no deposit is required.
 */
export function depositAmount(
  price: number,
  depositType?: 'none' | 'percent' | 'amount' | null,
  depositValue?: number | null
): number | null {
  if (!depositType || depositType === 'none' || !depositValue || depositValue <= 0) return null;
  if (depositType === 'percent') {
    if (depositValue > 100) return null;
    const amt = Math.round((price * depositValue) / 100 * 100) / 100;
    return amt > 0 ? amt : null;
  }
  return depositValue;
}

/** وصف العربون بالعربية/الإنجليزية: "عربون 20% (100 ج.م)" */
export function depositLabel(
  price: number,
  depositType?: 'none' | 'percent' | 'amount' | null,
  depositValue?: number | null,
  locale: 'ar' | 'en' = 'ar'
): string | null {
  const amt = depositAmount(price, depositType, depositValue);
  if (amt === null) return null;
  if (depositType === 'percent') {
    return locale === 'ar'
      ? `${depositValue}% (${formatPrice(amt, locale)} ج.م)`
      : `${depositValue}% (${formatPrice(amt, locale)} EGP)`;
  }
  return locale === 'ar'
    ? `${formatPrice(amt, locale)} ج.م`
    : `${formatPrice(amt, locale)} EGP`;
}

/** Arabic/English label for delivery duration: "يصل خلال ٣ أيام" / "Arrives within 3 days" */
export function deliveryDaysLabel(days: number, locale: 'ar' | 'en' = 'ar'): string {
  if (locale === 'ar') {
    if (days === 1) return 'يصل خلال يوم واحد';
    if (days === 2) return 'يصل خلال يومين';
    if (days <= 10) return `يصل خلال ${days} أيام`;
    return `يصل خلال ${days} يوماً`;
  }
  return `Arrives within ${days} day${days > 1 ? 's' : ''}`;
}

/* ─────────── Product share caption ─────────── */

/** اسم خيار الاستلام بالعربي مع أيقونة. */
function fulfillmentLabel(opt: 'delivery' | 'store_pickup' | 'address_pickup'): string {
  switch (opt) {
    case 'delivery':
      return '🚚 توصيل للمنزل';
    case 'store_pickup':
      return '🏬 استلام من المتجر';
    case 'address_pickup':
      return '📍 استلام من عنوان';
    default:
      return opt;
  }
}

/**
 * يبني كابشن مشاركة جميل للمنتج يحتوي كل التفاصيل ما عدا السعر،
 * مع أيقونات (إيموجي) — وفي النهاية دعوة للتسجيل لمعرفة السعر.
 *
 * يُستخدم كنص المشاركة (Web Share / واتساب / تيليجرام …) بحيث يصل المستلم
 * كل تفاصيل المنتج، ولا يظهر السعر إلا بعد دخول الموقع والتسجيل.
 */
export function buildProductShareCaption(p: {
  title: string;
  storeName?: string | null;
  storeCity?: string | null;
  categoryName?: string | null;
  brand?: string | null;
  description?: string | null;
  isAvailable?: boolean;
  deliveryType?: 'instant' | 'preorder' | null;
  deliveryDays?: number | null;
  sizes?: { name: string; available?: boolean }[] | null;
  colors?: { name: string; available?: boolean }[] | null;
  fulfillmentOptions?: ('delivery' | 'store_pickup' | 'address_pickup')[] | null;
}): string {
  const lines: string[] = [];

  lines.push(`✨ ${p.title}`);

  if (p.brand) lines.push(`🏷️ الماركة: ${p.brand}`);
  if (p.storeName) {
    lines.push(`🏪 المتجر: ${p.storeName}${p.storeCity ? ` — ${p.storeCity}` : ''}`);
  }
  if (p.categoryName) lines.push(`📂 القسم: ${p.categoryName}`);

  // التوفّر / طريقة الحجز
  if (p.deliveryType === 'preorder') {
    lines.push(`⏳ ${p.deliveryDays ? deliveryDaysLabel(p.deliveryDays, 'ar') : 'حجز مسبق'}`);
  } else {
    lines.push('⚡ متاح فوراً وجاهز للتسليم');
  }
  if (p.isAvailable === false) lines.push('🚫 غير متاح حالياً');

  // المقاسات المتاحة
  const sizes = (p.sizes ?? []).filter((s) => s.available !== false).map((s) => s.name);
  if (sizes.length) lines.push(`📏 المقاسات: ${sizes.join('، ')}`);

  // الألوان المتاحة
  const colors = (p.colors ?? []).filter((c) => c.available !== false).map((c) => c.name);
  if (colors.length) lines.push(`🎨 الألوان: ${colors.join('، ')}`);

  // خيارات الاستلام
  const fulfil = (p.fulfillmentOptions ?? []).map(fulfillmentLabel);
  if (fulfil.length) lines.push(`📦 الاستلام: ${fulfil.join(' • ')}`);

  // وصف مختصر
  if (p.description) {
    const desc = p.description.replace(/\s+/g, ' ').trim().slice(0, 140);
    if (desc) lines.push(`📝 ${desc}${p.description.length > 140 ? '…' : ''}`);
  }

  // دعوة لمعرفة السعر — بدون كشف السعر
  lines.push('');
  lines.push('💰 السعر مخفي 👀 — لمعرفة السعر ادخل وسجّل على الموقع 👇');
  lines.push('🛒 الأقصر سمارت مول');

  return lines.join('\n');
}
