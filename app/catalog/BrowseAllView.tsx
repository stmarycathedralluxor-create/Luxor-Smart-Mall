'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search, SlidersHorizontal, X, BookOpen, Tag, Store as StoreIcon, Sparkles,
  TrendingUp, BadgePercent, Layers, ChevronDown, MapPin, Eye, Zap, CalendarClock,
} from 'lucide-react';
import CroppedImage from '@/components/CroppedImage';
import ShareButton from '@/components/ShareButton';
import ProductCard from '@/components/ProductCard';
import { discountPercent, deliveryDaysLabel } from '@/lib/utils';
import type { Category, ProductWithStore } from '@/lib/types';

type StoreLite = { id: string; name: string; slug: string };

type Filters = {
  q: string;
  category: string; // category slug
  brand: string;
  store: string; // store id
  sort: string; // newest | price_asc | price_desc | views
  min: string;
  max: string;
  preset: string;
};

/** فلاتر جاهزة (presets) — طرق عرض منسّقة مسبقاً للكتالوج */
const PRESETS: {
  key: string;
  label: string;
  Icon: typeof Sparkles;
  apply: (f: Filters) => Filters;
}[] = [
  { key: 'all', label: 'كل المنتجات', Icon: Layers, apply: (f) => ({ ...f, category: '', brand: '', store: '', min: '', max: '', sort: 'newest' }) },
  { key: 'newest', label: 'الأحدث', Icon: Sparkles, apply: (f) => ({ ...f, sort: 'newest' }) },
  { key: 'popular', label: 'الأكثر مشاهدة', Icon: TrendingUp, apply: (f) => ({ ...f, sort: 'views' }) },
  { key: 'deals', label: 'عروض وخصومات', Icon: BadgePercent, apply: (f) => ({ ...f, sort: 'newest' }) },
  { key: 'under500', label: 'أقل من 500 ج.م', Icon: Tag, apply: (f) => ({ ...f, min: '', max: '500', sort: 'price_asc' }) },
  { key: 'premium', label: 'الفئة الفاخرة (+2000)', Icon: Sparkles, apply: (f) => ({ ...f, min: '2000', max: '', sort: 'price_desc' }) },
];

export default function BrowseAllView({
  products,
  categories,
  stores,
  brands,
  initialFilters,
  /** 'catalog' = عرض مجلة (افتراضي). 'products' = شبكة منتجات نظيفة لصفحة المنتجات. */
  variant = 'catalog',
}: {
  products: ProductWithStore[];
  categories: Category[];
  stores: StoreLite[];
  brands: string[];
  initialFilters: Filters;
  variant?: 'catalog' | 'products';
}) {
  const isProducts = variant === 'products';
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));
  const reset = () =>
    setFilters({ q: '', category: '', brand: '', store: '', sort: 'newest', min: '', max: '', preset: '' });

  const applyPreset = (key: string) => {
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    setFilters((f) => ({ ...preset.apply(f), preset: key }));
  };

  const filtered = useMemo(() => {
    let list = [...products];
    const q = filters.q.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          (p.brand || '').toLowerCase().includes(q)
      );
    }
    if (filters.category) list = list.filter((p) => p.category?.slug === filters.category);
    if (filters.brand) list = list.filter((p) => (p.brand || '') === filters.brand);
    if (filters.store) list = list.filter((p) => p.store_id === filters.store);
    if (filters.min) list = list.filter((p) => p.price >= Number(filters.min));
    if (filters.max) list = list.filter((p) => p.price <= Number(filters.max));
    // "deals" preset → only discounted products
    if (filters.preset === 'deals') {
      list = list.filter((p) => discountPercent(p.price, p.compare_at_price) !== null);
    }

    switch (filters.sort) {
      case 'price_asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'views':
        list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        break;
      default:
        list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    return list;
  }, [products, filters]);

  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.category ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    (filters.store ? 1 : 0) +
    (filters.min ? 1 : 0) +
    (filters.max ? 1 : 0);

  return (
    <div className="bg-luxor-sandlight/30 min-h-screen">
      {/* ─────────── MAGAZINE COVER / HERO ─────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian">
        <div className="absolute inset-0 pattern-egyptian opacity-20" aria-hidden />
        <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-luxor-gold/20 blur-3xl" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-luxor-gold/15 border border-luxor-gold/30 text-luxor-goldlight px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4">
                {isProducts ? <Layers size={13} /> : <BookOpen size={13} />}
                {isProducts ? 'كل منتجات الأقصر سمارت مول' : 'كتالوج الأقصر سمارت مول'}
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                {isProducts ? (
                  <>كل <span className="text-gold-gradient">المنتجات</span></>
                ) : (
                  <>تصفّح <span className="text-gold-gradient">الكتالوج</span></>
                )}
              </h1>
              <p className="text-white/70 text-base md:text-lg max-w-2xl mt-3">
                {isProducts
                  ? 'تصفّح كل المنتجات المتاحة — ابحث وفلتر حسب القسم، البراند، المتجر أو نطاق السعر، ورتّب كما تشاء.'
                  : 'طريقة عرض عصرية كأنها مجلة — اكتشف المنتجات حسب القسم، البراند، أو نطاق السعر.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/5 backdrop-blur border border-luxor-gold/20 rounded-2xl px-5 py-3 text-center">
                <div className="text-2xl font-black text-luxor-goldlight">{filtered.length}</div>
                <div className="text-[11px] text-white/60 uppercase tracking-wider">منتج معروض</div>
              </div>
              <ShareButton
                path={isProducts ? '/search' : '/catalog/browse'}
                title="كل منتجات الأقصر سمارت مول"
                text="تصفّح كل منتجات الأقصر سمارت مول"
                label="مشاركة الصفحة"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-luxor-gold bg-white/10 backdrop-blur text-white font-bold px-4 py-3 hover:bg-luxor-gold hover:text-luxor-obsidian transition"
              />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
      </div>

      {/* ─────────── PRESET CHIPS ─────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
          {PRESETS.map(({ key, label, Icon }) => {
            const active = filters.preset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border-2 transition ${
                  active
                    ? 'border-luxor-gold bg-gold-gradient text-luxor-obsidian shadow'
                    : 'border-luxor-gold/30 bg-white text-luxor-navy/80 hover:border-luxor-gold'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────── FILTER BAR ─────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="bg-white rounded-2xl shadow-sm border border-luxor-gold/20 p-3 md:p-4">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute top-3 start-3 text-luxor-navy/40" size={18} />
              <input
                value={filters.q}
                onChange={(e) => patch({ q: e.target.value, preset: '' })}
                className="input-field ps-10 !py-2.5"
                placeholder="ابحث في الكتالوج…"
              />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value })}
                className="input-field !py-2.5 !pe-9 appearance-none font-semibold text-sm"
              >
                <option value="newest">الأحدث</option>
                <option value="price_asc">السعر: الأقل أولاً</option>
                <option value="price_desc">السعر: الأعلى أولاً</option>
                <option value="views">الأكثر مشاهدة</option>
              </select>
              <ChevronDown className="absolute top-3 end-3 text-luxor-navy/40 pointer-events-none" size={16} />
            </div>

            {/* Toggle advanced filters */}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                showFilters || activeCount
                  ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold'
                  : 'border-luxor-sand bg-white text-luxor-navy/70 hover:border-luxor-gold/50'
              }`}
            >
              <SlidersHorizontal size={16} />
              فلاتر
              {activeCount > 0 && (
                <span className="bg-luxor-gold text-luxor-obsidian rounded-full text-[10px] font-black px-1.5">
                  {activeCount}
                </span>
              )}
            </button>
          </div>

          {/* Advanced filters */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-luxor-sand grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">القسم</label>
                <select
                  value={filters.category}
                  onChange={(e) => patch({ category: e.target.value, preset: '' })}
                  className="input-field !py-2 text-sm"
                >
                  <option value="">كل الأقسام</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.icon} {c.name_ar}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">البراند</label>
                <select
                  value={filters.brand}
                  onChange={(e) => patch({ brand: e.target.value, preset: '' })}
                  className="input-field !py-2 text-sm"
                >
                  <option value="">كل البراندات</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">المتجر</label>
                <select
                  value={filters.store}
                  onChange={(e) => patch({ store: e.target.value, preset: '' })}
                  className="input-field !py-2 text-sm"
                >
                  <option value="">كل المتاجر</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">نطاق السعر (ج.م)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={filters.min}
                    onChange={(e) => patch({ min: e.target.value, preset: '' })}
                    className="input-field !py-2 text-sm"
                    placeholder="من"
                  />
                  <span className="text-luxor-navy/40">—</span>
                  <input
                    type="number"
                    min="0"
                    value={filters.max}
                    onChange={(e) => patch({ max: e.target.value, preset: '' })}
                    className="input-field !py-2 text-sm"
                    placeholder="إلى"
                  />
                </div>
              </div>
              {activeCount > 0 && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-xl px-3 py-2 transition"
                  >
                    <X size={14} /> مسح كل الفلاتر
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────── MAGAZINE GRID ─────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-luxor-gold/30 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-luxor-gold/10 mb-4">
              <BookOpen className="text-luxor-gold" size={40} />
            </div>
            <h3 className="text-xl font-bold text-luxor-obsidian mb-2">لا توجد منتجات مطابقة</h3>
            <p className="text-luxor-obsidian/60 max-w-md mx-auto mb-4">
              جرّب تعديل الفلاتر أو مسحها لعرض المزيد من المنتجات.
            </p>
            {activeCount > 0 && (
              <button onClick={reset} className="btn-outline inline-flex">
                <X size={16} /> مسح الفلاتر
              </button>
            )}
          </div>
        ) : isProducts ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <MagazineGrid products={filtered} />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Magazine-style editorial grid: a hero feature,
   medium tiles, and a clean masonry-ish rhythm.
   ───────────────────────────────────────────── */
function MagazineGrid({ products }: { products: ProductWithStore[] }) {
  const [feature, ...rest] = products;
  return (
    <div className="space-y-6">
      {/* Featured hero (first product) + two side tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FeatureTile product={feature} className="lg:col-span-2" big />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          {rest.slice(0, 2).map((p) => (
            <FeatureTile key={p.id} product={p} />
          ))}
        </div>
      </div>

      {/* The rest as an editorial grid */}
      {rest.length > 2 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {rest.slice(2).map((p) => (
            <MagazineCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function badge(p: ProductWithStore) {
  const pct = discountPercent(p.price, p.compare_at_price);
  const isPreorder = p.delivery_type === 'preorder';
  return { pct, isPreorder };
}

/** Large editorial tile with overlaid title — magazine cover feel */
function FeatureTile({
  product,
  className = '',
  big = false,
}: {
  product: ProductWithStore;
  className?: string;
  big?: boolean;
}) {
  const img = product.images?.[0];
  const crop = product.images_meta?.[0] ?? null;
  const { pct, isPreorder } = badge(product);
  return (
    <Link
      href={`/products/${product.id}`}
      className={`group relative block overflow-hidden rounded-3xl bg-luxor-obsidian shadow-sm hover:shadow-luxor-lg transition-all ${className}`}
    >
      <div className={`relative ${big ? 'aspect-[16/11] lg:aspect-[16/10]' : 'aspect-[16/10]'} overflow-hidden`}>
        {img ? (
          <span className="absolute inset-0 block group-hover:scale-105 transition-transform duration-700 ease-out">
            <CroppedImage src={img} crop={crop} alt={product.title} sizes="(max-width: 1024px) 100vw, 66vw" />
          </span>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={64} />
          </div>
        )}
        {/* editorial gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/95 via-luxor-obsidian/20 to-transparent" />

        {/* top badges */}
        <div className="absolute top-3 start-3 flex items-center gap-1.5 flex-wrap">
          {pct !== null && (
            <span className="bg-red-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow" dir="ltr">
              -{pct}%
            </span>
          )}
          {product.category && (
            <span className="bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              {product.category.icon} {product.category.name_ar}
            </span>
          )}
        </div>

        {/* bottom content */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
          {product.brand && (
            <span className="inline-block bg-white/15 backdrop-blur text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold mb-1.5 uppercase tracking-wide">
              {product.brand}
            </span>
          )}
          <h3 className={`font-black text-white leading-tight ${big ? 'text-xl md:text-3xl' : 'text-lg'} line-clamp-2`}>
            {product.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 text-white/70 text-xs flex-wrap">
            {product.store && (
              <span className="inline-flex items-center gap-1">
                <StoreIcon size={12} className="text-luxor-goldlight" />
                {product.store.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              {isPreorder ? <CalendarClock size={12} /> : <Zap size={12} />}
              {isPreorder
                ? product.delivery_days
                  ? deliveryDaysLabel(product.delivery_days, 'ar')
                  : 'حجز مسبق'
                : 'متاح فوراً'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={12} /> {product.views ?? 0}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Standard magazine card */
function MagazineCard({ product }: { product: ProductWithStore }) {
  const img = product.images?.[0];
  const crop = product.images_meta?.[0] ?? null;
  const { pct, isPreorder } = badge(product);
  return (
    <Link
      href={`/products/${product.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-luxor-gold/20 shadow-sm hover:shadow-luxor-lg hover:border-luxor-gold/50 transition-all"
    >
      <div className="relative aspect-square overflow-hidden bg-luxor-obsidian">
        {img ? (
          <span className="absolute inset-0 block group-hover:scale-110 transition-transform duration-700 ease-out">
            <CroppedImage src={img} crop={crop} alt={product.title} sizes="(max-width: 768px) 50vw, 25vw" />
          </span>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
            <StoreIcon size={48} />
          </div>
        )}
        {pct !== null && (
          <span className="absolute top-2 start-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-[11px] font-bold shadow" dir="ltr">
            -{pct}%
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
      </div>
      <div className="p-3">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
              isPreorder ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
            }`}
          >
            {isPreorder ? <CalendarClock size={10} /> : <Zap size={10} />}
            {isPreorder
              ? product.delivery_days
                ? deliveryDaysLabel(product.delivery_days, 'ar')
                : 'حجز مسبق'
              : 'فوري'}
          </span>
          {product.brand && (
            <span className="bg-luxor-obsidian text-luxor-goldlight border border-luxor-gold/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {product.brand}
            </span>
          )}
        </div>
        <h3 className="font-bold text-luxor-obsidian line-clamp-2 min-h-[2.5rem] text-sm leading-snug group-hover:text-luxor-darkgold transition">
          {product.title}
        </h3>
        {product.store && (
          <div className="text-[11px] text-luxor-obsidian/55 mt-1 flex items-center gap-1 truncate">
            <StoreIcon size={11} className="text-luxor-darkgold shrink-0" />
            <span className="truncate">{product.store.name}</span>
            {product.store.city && (
              <span className="inline-flex items-center gap-0.5 text-luxor-obsidian/40">
                <MapPin size={10} /> {product.store.city}
              </span>
            )}
          </div>
        )}
        <div className="mt-2.5 pt-2 border-t border-luxor-gold/20">
          <span className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold text-luxor-goldlight bg-luxor-obsidian border border-luxor-gold/50 px-3 py-2 rounded-xl group-hover:bg-gold-gradient group-hover:text-luxor-obsidian transition">
            <Tag size={13} /> اعرف السعر
          </span>
        </div>
      </div>
    </Link>
  );
}
