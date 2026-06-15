'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, Loader2, Tag, Store as StoreIcon } from 'lucide-react';
import CroppedImage from '@/components/CroppedImage';
import { useLocale } from './LocaleProvider';
import type { ImageCrop } from '@/lib/types';

type Suggestion = {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  store: string | null;
  image: string | null;
  crop: ImageCrop | null;
};

/**
 * NavbarSearch — بحث حيّ في شريط التنقّل العلوي.
 *
 *  • أثناء الكتابة تظهر قائمة منسدلة باقتراحات المنتجات المطابقة (كأغلب المواقع).
 *  • الضغط على اقتراح يفتح صفحة المنتج مباشرةً.
 *  • الضغط على Enter (أو زر البحث) ينتقل إلى صفحة المنتجات /search?q=الكلمة.
 *  • لا ينتقل لصفحة المنتجات بمجرّد الكتابة — فقط عند البحث الفعلي.
 *
 *  variant='desktop' → حقل ممتد يظهر في وسط الشريط (md+).
 *  variant='mobile'  → أيقونة تفتح حقل بحث منبثق أسفل الشريط (الجوال).
 */
export default function NavbarSearch({
  variant = 'desktop',
  onNavigate,
}: {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const { locale } = useLocale();
  const ar = locale === 'ar';
  const router = useRouter();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // جلب الاقتراحات (debounced)
  useEffect(() => {
    const term = q.trim();
    setHighlight(-1);
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch {
        /* ignored (aborted or network) */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  const goToSearch = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const goToProduct = (id: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(`/products/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlight >= 0 && results[highlight]) goToProduct(results[highlight].id);
      else goToSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(results.length - 1, h + 1));
      setOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(-1, h - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const placeholder = ar ? 'ابحث عن منتج…' : 'Search products…';

  const dropdown =
    open && q.trim().length >= 2 ? (
      <div
        className="absolute z-[70] mt-2 w-full overflow-hidden rounded-2xl border border-luxor-gold/30 bg-white shadow-luxor-lg"
        role="listbox"
      >
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-luxor-navy/60">
            <Loader2 size={16} className="animate-spin" />
            {ar ? 'جاري البحث…' : 'Searching…'}
          </div>
        ) : results.length === 0 ? (
          <button
            type="button"
            onClick={goToSearch}
            className="flex w-full items-center gap-2 px-4 py-4 text-start text-sm text-luxor-navy/70 hover:bg-luxor-sand/40"
          >
            <Search size={16} className="text-luxor-gold" />
            {ar ? 'لا توجد نتائج سريعة — اعرض كل النتائج' : 'No quick results — view all'}
          </button>
        ) : (
          <ul className="max-h-[70vh] overflow-y-auto">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => goToProduct(r.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition ${
                    highlight === i ? 'bg-luxor-gold/10' : 'hover:bg-luxor-sand/40'
                  }`}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-luxor-sandlight">
                    {r.image ? (
                      <CroppedImage src={r.image} crop={r.crop} alt={r.title} sizes="44px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-luxor-gold/40">
                        <StoreIcon size={18} />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-luxor-obsidian">{r.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-luxor-navy/55">
                      {r.brand && <span className="font-semibold text-luxor-darkgold">{r.brand}</span>}
                      {r.store && (
                        <span className="inline-flex items-center gap-0.5">
                          <StoreIcon size={10} /> {r.store}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            <li className="border-t border-luxor-gold/15">
              <button
                type="button"
                onClick={goToSearch}
                className="flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-luxor-darkgold hover:bg-luxor-gold/10"
              >
                <Search size={15} />
                {ar ? `عرض كل النتائج عن «${q.trim()}»` : `View all results for “${q.trim()}”`}
              </button>
            </li>
          </ul>
        )}
      </div>
    ) : null;

  if (variant === 'mobile') {
    return (
      <div ref={boxRef} className="relative w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToSearch();
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-luxor-navy/40" size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            inputMode="search"
            className="input-field !py-2.5 ps-10 pe-9"
            placeholder={placeholder}
            aria-label={placeholder}
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                inputRef.current?.focus();
              }}
              className="absolute top-1/2 end-2.5 -translate-y-1/2 rounded-full p-1 text-luxor-navy/40 hover:bg-luxor-sand/60"
              aria-label="مسح"
            >
              <X size={16} />
            </button>
          )}
        </form>
        {dropdown}
      </div>
    );
  }

  // desktop
  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch();
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-luxor-navy/40" size={18} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          inputMode="search"
          className="w-full rounded-full border border-luxor-gold/40 bg-luxor-sandlight/50 py-2.5 ps-10 pe-9 text-sm text-luxor-obsidian outline-none transition focus:border-luxor-gold focus:bg-white focus:ring-2 focus:ring-luxor-gold/20"
          placeholder={placeholder}
          aria-label={placeholder}
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 end-2.5 -translate-y-1/2 rounded-full p-1 text-luxor-navy/40 hover:bg-luxor-sand/60"
            aria-label="مسح"
          >
            <X size={16} />
          </button>
        ) : null}
      </form>
      {dropdown}
    </div>
  );
}
