'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  BookOpen, Save, Loader2, ImagePlus, X, Globe, Store as StoreIcon,
  ListChecks, ArrowDownWideNarrow, Star, LayoutGrid, Search, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { blobExt, checkQuotaBeforeUpload, removeStorageUrls, uploadImage } from '@/lib/storage';
import { slugify, formatPrice } from '@/lib/utils';
import type { Catalog, CatalogFilterType, CatalogScope, Product, Store } from '@/lib/types';

type PickProduct = Pick<Product, 'id' | 'title' | 'price' | 'images' | 'currency'> & { store_id: string };

const FILTERS: { value: CatalogFilterType; label: string; hint: string; icon: any }[] = [
  { value: 'manual', label: 'اختيار يدوي', hint: 'اختر المنتجات بنفسك', icon: ListChecks },
  { value: 'all', label: 'كل منتجات المتجر', hint: 'كل منتجات المتجر المختار', icon: LayoutGrid },
  { value: 'price_high', label: 'الأعلى سعراً', hint: 'يرتّب تلقائياً', icon: ArrowDownWideNarrow },
  { value: 'rating_high', label: 'الأعلى تقييماً', hint: 'يرتّب تلقائياً', icon: Star },
];

export default function CatalogForm({
  catalog,
  myStores,
  isAdmin,
  initialProductIds,
}: {
  catalog?: Catalog | null;
  myStores: Store[];
  isAdmin: boolean;
  initialProductIds?: string[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const editing = !!catalog;
  const primaryStore = myStores[0] ?? null;

  const [title, setTitle] = useState(catalog?.title ?? '');
  const [description, setDescription] = useState(catalog?.description ?? '');
  const [scope, setScope] = useState<CatalogScope>(catalog?.scope ?? 'store');
  const [filterType, setFilterType] = useState<CatalogFilterType>(catalog?.filter_type ?? 'manual');
  const [filterStoreId, setFilterStoreId] = useState<string>(
    catalog?.filter_store_id ?? catalog?.store_id ?? primaryStore?.id ?? ''
  );
  const [productLimit, setProductLimit] = useState<number>(catalog?.product_limit ?? 24);

  // الغلاف
  const [coverImage, setCoverImage] = useState<string | null>(catalog?.cover_image ?? null);
  const [persistedCover] = useState<string | null>(catalog?.cover_image ?? null);
  const [uploading, setUploading] = useState(false);

  // الاختيار اليدوي
  const [selectedIds, setSelectedIds] = useState<string[]>(initialProductIds ?? []);
  const [allProducts, setAllProducts] = useState<PickProduct[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // المتجر المصدر لاختيار المنتجات (للفلاتر التلقائية واليدوي)
  const sourceStoreId = filterStoreId || primaryStore?.id || '';

  // حمّل منتجات المتجر المصدر للاختيار اليدوي
  useEffect(() => {
    let active = true;
    if (filterType !== 'manual' || !sourceStoreId) {
      setAllProducts([]);
      return;
    }
    setLoadingProducts(true);
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, title, price, images, currency, store_id')
        .eq('store_id', sourceStoreId)
        .order('created_at', { ascending: false });
      if (active) {
        setAllProducts((data ?? []) as PickProduct[]);
        setLoadingProducts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [filterType, sourceStoreId, supabase]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter((p) => p.title.toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const quotaError = await checkQuotaBeforeUpload(supabase, file.size);
      if (quotaError) {
        setError(quotaError);
        setUploading(false);
        return;
      }
      const url = await uploadImage('store-assets', file, `catalog-${Date.now()}.${blobExt(file)}`);
      // حرّر الغلاف السابق إن كان رُفع في هذه الجلسة
      if (coverImage && coverImage !== persistedCover) void removeStorageUrls([coverImage]);
      setCoverImage(url);
    } catch (err: any) {
      setError(err?.message || 'فشل رفع الصورة');
    }
    setUploading(false);
  };

  const removeCover = () => {
    if (coverImage && coverImage !== persistedCover) void removeStorageUrls([coverImage]);
    setCoverImage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('اسم الكتالوج مطلوب');
      return;
    }
    if (filterType !== 'manual' && !sourceStoreId) {
      setError('اختر المتجر المصدر للمنتجات');
      return;
    }
    if (filterType === 'manual' && selectedIds.length === 0) {
      setError('اختر منتجاً واحداً على الأقل');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError('انتهت الجلسة. سجّل الدخول من جديد.');
      return;
    }

    // المتجر المالك للكتالوج (لربط النطاق store بصفحة المتجر)
    const ownerStoreId = sourceStoreId || primaryStore?.id || null;

    // كتالوجات المتجر معتمدة فوراً؛ العامة تحتاج موافقة (إلا للأدمن)
    const isApproved = scope === 'store' ? true : isAdmin;

    const payload: any = {
      owner_id: user.id,
      store_id: ownerStoreId,
      title: title.trim(),
      description: description.trim() || null,
      cover_image: coverImage,
      scope,
      is_approved: isApproved,
      filter_type: filterType,
      filter_store_id: filterType === 'manual' ? null : sourceStoreId || null,
      product_limit: Math.max(1, Math.min(Number(productLimit) || 24, 100)),
      updated_at: new Date().toISOString(),
    };

    let catalogId = catalog?.id;

    if (editing) {
      const { error: upErr } = await supabase.from('catalogs').update(payload).eq('id', catalog!.id);
      if (upErr) {
        setSaving(false);
        setError(upErr.message);
        return;
      }
    } else {
      // أنشئ slug فريداً بأحرف ASCII فقط (نتفادى الأحرف العربية في الروابط
      // لأنها تُرمَّز percent-encoding وقد تتسبّب في عدم تطابق وفتح 404).
      const asciiBase = slugify(title)
        .replace(/[^a-z0-9-]/gi, '') // أبقِ الإنجليزية والأرقام والشرطة فقط
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
      const base = asciiBase || 'catalog';
      payload.slug = `${base}-${Math.random().toString(36).slice(2, 8)}`;
      const { data: inserted, error: insErr } = await supabase
        .from('catalogs')
        .insert(payload)
        .select('id')
        .single();
      if (insErr || !inserted) {
        setSaving(false);
        setError(insErr?.message || 'فشل إنشاء الكتالوج');
        return;
      }
      catalogId = inserted.id;
    }

    // حدّث منتجات الاختيار اليدوي
    if (filterType === 'manual' && catalogId) {
      // امسح القديم ثم أضف الجديد بالترتيب
      await supabase.from('catalog_products').delete().eq('catalog_id', catalogId);
      const rows = selectedIds.map((pid, i) => ({
        catalog_id: catalogId,
        product_id: pid,
        position: i,
      }));
      if (rows.length) {
        const { error: cpErr } = await supabase.from('catalog_products').insert(rows);
        if (cpErr) {
          setSaving(false);
          setError(cpErr.message);
          return;
        }
      }
    } else if (catalogId) {
      // غيّر إلى فلتر تلقائي ← نظّف الاختيار اليدوي القديم
      await supabase.from('catalog_products').delete().eq('catalog_id', catalogId);
    }

    setSaving(false);
    router.push('/dashboard/catalogs');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* الاسم والوصف */}
      <div className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-bold text-luxor-navy mb-1.5">اسم الكتالوج *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: تشكيلة الشتاء، الأكثر مبيعاً..."
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-luxor-navy mb-1.5">وصف مختصر (اختياري)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="input-field resize-none"
            placeholder="وصف يظهر في غلاف المجلة"
          />
        </div>
      </div>

      {/* صورة الغلاف */}
      <div className="card p-5">
        <label className="block text-sm font-bold text-luxor-navy mb-2">صورة الغلاف (اختياري)</label>
        {coverImage ? (
          <div className="relative w-full max-w-xs aspect-[3/4] rounded-2xl overflow-hidden border-2 border-luxor-gold/30">
            <Image src={coverImage} alt="cover" fill className="object-cover" sizes="320px" />
            <button
              type="button"
              onClick={removeCover}
              className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
              aria-label="remove cover"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full max-w-xs aspect-[3/4] rounded-2xl border-2 border-dashed border-luxor-gold/40 cursor-pointer hover:bg-luxor-gold/5">
            {uploading ? (
              <Loader2 className="animate-spin text-luxor-gold" size={28} />
            ) : (
              <>
                <ImagePlus className="text-luxor-gold mb-2" size={28} />
                <span className="text-sm text-luxor-navy/60">إضافة غلاف</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onCoverChange} disabled={uploading} />
          </label>
        )}
        <p className="text-xs text-luxor-navy/50 mt-2">
          إن لم تُضِف غلافاً سنستخدم صورة أول منتج تلقائياً.
        </p>
      </div>

      {/* النطاق */}
      <div className="card p-5">
        <label className="block text-sm font-bold text-luxor-navy mb-3">أين يظهر الكتالوج؟</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setScope('store')}
            className={`text-right rounded-2xl border-2 p-4 transition ${
              scope === 'store'
                ? 'border-luxor-gold bg-luxor-gold/10'
                : 'border-luxor-navy/15 hover:border-luxor-gold/40'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-luxor-navy">
              <StoreIcon size={18} /> على متجري فقط
            </div>
            <p className="text-xs text-luxor-navy/60 mt-1">يظهر فوراً على صفحة متجرك — بدون موافقة.</p>
          </button>
          <button
            type="button"
            onClick={() => setScope('global')}
            className={`text-right rounded-2xl border-2 p-4 transition ${
              scope === 'global'
                ? 'border-luxor-gold bg-luxor-gold/10'
                : 'border-luxor-navy/15 hover:border-luxor-gold/40'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-luxor-navy">
              <Globe size={18} /> عام (صفحة الكتالوجات)
            </div>
            <p className="text-xs text-luxor-navy/60 mt-1">
              {isAdmin ? 'يظهر فوراً (أنت أدمن).' : 'يحتاج موافقة الإدارة قبل الظهور.'}
            </p>
          </button>
        </div>
      </div>

      {/* طريقة اختيار المنتجات */}
      <div className="card p-5">
        <label className="block text-sm font-bold text-luxor-navy mb-3">طريقة اختيار المنتجات</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = filterType === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilterType(f.value)}
                className={`text-center rounded-xl border-2 p-3 transition ${
                  active ? 'border-luxor-gold bg-luxor-gold/10' : 'border-luxor-navy/15 hover:border-luxor-gold/40'
                }`}
              >
                <Icon size={18} className="mx-auto mb-1 text-luxor-gold" />
                <div className="text-xs font-bold text-luxor-navy">{f.label}</div>
                <div className="text-[10px] text-luxor-navy/50 mt-0.5">{f.hint}</div>
              </button>
            );
          })}
        </div>

        {/* المتجر المصدر */}
        {myStores.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-bold text-luxor-navy mb-1.5">المتجر المصدر للمنتجات</label>
            <select
              value={filterStoreId}
              onChange={(e) => setFilterStoreId(e.target.value)}
              className="input-field"
            >
              {myStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* حد العدد للفلاتر التلقائية */}
        {filterType !== 'manual' && (
          <div className="mt-4 max-w-[200px]">
            <label className="block text-sm font-bold text-luxor-navy mb-1.5">أقصى عدد منتجات</label>
            <input
              type="number"
              min={1}
              max={100}
              value={productLimit}
              onChange={(e) => setProductLimit(Number(e.target.value))}
              className="input-field"
            />
          </div>
        )}
      </div>

      {/* منتقي المنتجات اليدوي */}
      {filterType === 'manual' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <label className="text-sm font-bold text-luxor-navy">
              اختر المنتجات <span className="text-luxor-gold">({selectedIds.length})</span>
            </label>
            <div className="relative">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-luxor-navy/40" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="ابحث بالاسم..."
                className="input-field !py-2 !pr-9 !text-sm w-56"
              />
            </div>
          </div>

          {loadingProducts ? (
            <div className="py-10 text-center text-luxor-navy/50">
              <Loader2 className="animate-spin mx-auto mb-2" size={24} /> جارٍ تحميل المنتجات…
            </div>
          ) : !filteredProducts.length ? (
            <p className="py-8 text-center text-luxor-navy/50 text-sm">لا توجد منتجات في هذا المتجر.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto p-1">
              {filteredProducts.map((p) => {
                const selected = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className={`relative text-right rounded-xl border-2 overflow-hidden transition ${
                      selected ? 'border-luxor-gold ring-2 ring-luxor-gold/30' : 'border-luxor-navy/10 hover:border-luxor-gold/40'
                    }`}
                  >
                    <div className="relative aspect-square bg-luxor-sand/30">
                      {p.images?.[0] && (
                        <Image src={p.images[0]} alt={p.title} fill className="object-cover" sizes="160px" />
                      )}
                      {selected && (
                        <span className="absolute top-1.5 right-1.5 bg-luxor-gold text-white rounded-full p-1">
                          <Check size={12} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-semibold text-luxor-navy line-clamp-1">{p.title}</div>
                      <div className="text-[11px] text-luxor-gold font-bold mt-0.5">
                        {formatPrice(p.price)} {p.currency || 'ج.م'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={saving || uploading} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {editing ? 'حفظ التعديلات' : 'إنشاء الكتالوج'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/catalogs')}
          className="btn-outline"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
