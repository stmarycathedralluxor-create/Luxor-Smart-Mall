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
