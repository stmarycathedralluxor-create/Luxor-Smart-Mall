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
