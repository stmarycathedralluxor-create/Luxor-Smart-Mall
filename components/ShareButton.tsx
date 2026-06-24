'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Share2,
  Link as LinkIcon,
  Check,
  MessageCircle,
  Facebook,
  Send,
  X,
} from 'lucide-react';
import { absoluteUrl } from '@/lib/utils';

/**
 * ShareButton — زر مشاركة عام للموقع/المتجر/المنتج.
 *
 * - يستخدم Web Share API الأصلي على الجوال (يفتح ورقة المشاركة الأصلية
 *   مع نفس صورة المعاينة الموجودة في وسوم OG للصفحة — أي صورة المنتج
 *   أو صورة بروفايل المتجر التي ضبطناها في generateMetadata).
 * - على سطح المكتب يعرض قائمة منسدلة: نسخ الرابط + واتساب + فيسبوك + تيليجرام.
 *
 * يبني دائماً رابطاً قانونياً (بدون www.) عبر absoluteUrl حتى لا تبدأ
 * الروابط أحياناً بـ www.
 */
export default function ShareButton({
  /** المسار النسبي للصفحة المراد مشاركتها (مثل /products/123) — يُحوَّل لرابط مطلق قانوني */
  path,
  /** عنوان المشاركة */
  title,
  /** نص المشاركة (اختياري) */
  text,
  /** نمط العرض: أيقونة فقط أو زر بنص */
  variant = 'button',
  label = 'مشاركة',
  className = '',
  /** اتجاه فتح القائمة المنسدلة على سطح المكتب — 'up' مفيد داخل كروت
   *  ذات overflow-hidden حتى لا تُقصّ القائمة أسفل الكارت. */
  menuPlacement = 'down',
}: {
  path: string;
  title: string;
  text?: string;
  variant?: 'button' | 'icon';
  label?: string;
  className?: string;
  menuPlacement?: 'up' | 'down';
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(absoluteUrl(path));
  }, [path]);

  // close the dropdown on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shareText = text || title;

  const handleClick = async () => {
    const shareUrl = url || absoluteUrl(path);
    // Native share sheet on mobile — uses the page's OG image automatically.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url: shareUrl });
        return;
      } catch {
        /* user cancelled — fall through to the menu */
      }
    }
    setOpen((o) => !o);
  };

  const copy = async () => {
    const shareUrl = url || absoluteUrl(path);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const enc = encodeURIComponent(url || absoluteUrl(path));
  const encText = encodeURIComponent(shareText);
  const links = [
    {
      key: 'whatsapp',
      label: 'واتساب',
      href: `https://wa.me/?text=${encText}%20${enc}`,
      Icon: MessageCircle,
      color: 'text-emerald-600',
    },
    {
      key: 'facebook',
      label: 'فيسبوك',
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
      Icon: Facebook,
      color: 'text-blue-600',
    },
    {
      key: 'telegram',
      label: 'تيليجرام',
      href: `https://t.me/share/url?url=${enc}&text=${encText}`,
      Icon: Send,
      color: 'text-sky-500',
    },
  ];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ||
          (variant === 'icon'
            ? 'inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-luxor-gold/40 text-luxor-darkgold hover:bg-luxor-gold/10 transition shadow-sm'
            : 'inline-flex items-center gap-2 rounded-xl border-2 border-luxor-gold/50 bg-white text-luxor-darkgold font-bold px-4 py-2.5 hover:bg-luxor-gold/10 transition shadow-sm')
        }
        aria-label={label}
        title={label}
      >
        <Share2 size={variant === 'icon' ? 18 : 18} />
        {variant === 'button' && <span>{label}</span>}
      </button>

      {open && (
        <div
          className={`absolute end-0 w-56 bg-white rounded-2xl shadow-xl border border-luxor-gold/20 p-2 z-50 animate-fade-in ${
            menuPlacement === 'up' ? 'bottom-full mb-2' : 'mt-2'
          }`}
        >
          <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-luxor-sand">
            <span className="text-xs font-bold text-luxor-navy/70">مشاركة عبر</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-luxor-navy/40 hover:text-luxor-navy rounded-full p-1"
              aria-label="إغلاق"
            >
              <X size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-2.5 w-full text-start px-2.5 py-2 rounded-lg hover:bg-luxor-gold/10 text-sm font-medium text-luxor-navy transition"
          >
            {copied ? (
              <Check size={16} className="text-emerald-600" />
            ) : (
              <LinkIcon size={16} className="text-luxor-darkgold" />
            )}
            {copied ? 'تم نسخ الرابط' : 'نسخ الرابط'}
          </button>

          {links.map(({ key, label, href, Icon, color }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full text-start px-2.5 py-2 rounded-lg hover:bg-luxor-gold/10 text-sm font-medium text-luxor-navy transition"
            >
              <Icon size={16} className={color} />
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
