'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Upload, X, Save, Crop, Zap, CalendarClock, Percent, Ruler, Palette, Plus, ImageIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ImageEditor from '@/components/ImageEditor';
import { checkQuotaBeforeUpload, removeStorageUrls, uploadImage } from '@/lib/storage';
import { discountPercent } from '@/lib/utils';
import type { Category, Product, ProductColor, ProductSize } from '@/lib/types';

type EditingState = {
  src: string;
  isObjectUrl: boolean;
  /** index to replace, or null to append. Remaining queue of files to edit after this one */
  replaceIndex: number | null;
  queue: File[];
} | null;

/** ألوان جاهزة شائعة للاختيار السريع */
const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'أسود', hex: '#1a1a1a' },
  { name: 'أبيض', hex: '#f5f5f5' },
  { name: 'أحمر', hex: '#dc2626' },
  { name: 'أزرق', hex: '#2563eb' },
  { name: 'أخضر', hex: '#16a34a' },
  { name: 'أصفر', hex: '#eab308' },
  { name: 'برتقالي', hex: '#ea580c' },
  { name: 'وردي', hex: '#ec4899' },
  { name: 'بنفسجي', hex: '#9333ea' },
  { name: 'بني', hex: '#92400e' },
  { name: 'رمادي', hex: '#6b7280' },
  { name: 'بيج', hex: '#d6c7a1' },
  { name: 'ذهبي', hex: '#D4AF37' },
  { name: 'فضي', hex: '#c0c0c0' },
  { name: 'كحلي', hex: '#1e3a5f' },
];

/** مقاسات جاهزة شائعة */
const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', '38', '40', '42', '44'];

export default function ProductForm({
  storeId,
  userId,
  categories,
  initialProduct,
}: {
  storeId: string;
  userId: string;
  categories: Category[];
  initialProduct?: Product;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    title: initialProduct?.title ?? '',
    description: initialProduct?.description ?? '',
    price: initialProduct?.price ?? 0,
    compare_at_price: initialProduct?.compare_at_price ?? null as number | null,
    category_id: initialProduct?.category_id ?? null as number | null,
    images: initialProduct?.images ?? [] as string[],
    images_full: (initialProduct?.images_full ?? []) as string[],
    is_available: initialProduct?.is_available ?? true,
    delivery_type: initialProduct?.delivery_type ?? 'instant' as 'instant' | 'preorder',
    delivery_days: initialProduct?.delivery_days ?? 3,
    sizes: (initialProduct?.sizes ?? []) as ProductSize[],
    colors: (initialProduct?.colors ?? []) as ProductColor[],
  });
  const [hasDiscount, setHasDiscount] = useState(
    !!initialProduct?.compare_at_price && initialProduct.compare_at_price > (initialProduct.price ?? 0)
  );
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditingState>(null);
  const [newSize, setNewSize] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#D4AF37');
  // Images that already exist on the saved product (cleanup happens on submit)
  const persistedImages = initialProduct?.images ?? [];
  const persistedFull = initialProduct?.images_full ?? [];
  const isPersisted = (url: string) =>
    persistedImages.includes(url) || persistedFull.includes(url);

  /** New files picked → open the editor for the first one, queue the rest */
  const pickFiles = (files: FileList) => {
    const list = Array.from(files).slice(0, 8 - form.images.length);
    if (!list.length) return;
    const [first, ...rest] = list;
    setEditing({ src: URL.createObjectURL(first), isObjectUrl: true, replaceIndex: null, queue: rest });
  };

  /** Re-edit an already uploaded image — prefer the FULL original as source */
  const editExisting = (idx: number) => {
    const src = form.images_full[idx] || form.images[idx];
    setEditing({ src, isObjectUrl: false, replaceIndex: idx, queue: [] });
  };

  const advanceQueue = (queue: File[]) => {
    if (queue.length) {
      const [next, ...rest] = queue;
      setEditing({ src: URL.createObjectURL(next), isObjectUrl: true, replaceIndex: null, queue: rest });
    } else {
      setEditing(null);
    }
  };

  const handleEditorSave = async (blob: Blob, originalBlob?: Blob | null) => {
    if (!editing) return;
    setUploading(true);
    const totalSize = blob.size + (originalBlob?.size ?? 0);
    // Pre-check the seller's storage quota before uploading
    const quotaError = await checkQuotaBeforeUpload(supabase, totalSize);
    if (quotaError) {
      setError(quotaError);
      if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
      setUploading(false);
      setEditing(null);
      return;
    }
    try {
      // Upload cropped + full original to Cloudflare R2 via our server API
      const publicUrl = await uploadImage('product-images', blob);
      let fullUrl = '';
      if (originalBlob) {
        try {
          fullUrl = await uploadImage('product-images', originalBlob);
        } catch {
          fullUrl = ''; // best-effort — crop is what matters
        }
      }
      const replaceIndex = editing.replaceIndex;
      setForm((f) => {
        if (replaceIndex !== null) {
          const images = [...f.images];
          const imagesFull = [...f.images_full];
          const old = images[replaceIndex];
          const oldFull = imagesFull[replaceIndex];
          images[replaceIndex] = publicUrl;
          // Keep the previous full original when re-cropping an existing
          // image (the source was the same original) unless a new one came.
          imagesFull[replaceIndex] = fullUrl || oldFull || '';
          // The replaced image: if it was uploaded in THIS session (not yet
          // saved on the product), free its storage immediately
          const toFree: string[] = [];
          if (old && old !== publicUrl && !isPersisted(old)) toFree.push(old);
          if (fullUrl && oldFull && oldFull !== fullUrl && !isPersisted(oldFull)) toFree.push(oldFull);
          if (toFree.length) void removeStorageUrls(toFree);
          // re-link any color that pointed at the old cropped image
          const colors = f.colors.map((c) =>
            c.image === old ? { ...c, image: publicUrl } : c
          );
          return { ...f, images, images_full: imagesFull, colors };
        }
        const images = [...f.images, publicUrl].slice(0, 8);
        const imagesFull = [...f.images_full];
        imagesFull[images.length - 1] = fullUrl || '';
        return { ...f, images, images_full: imagesFull };
      });
    } catch (err: any) {
      setError(err?.message || 'فشل رفع الصورة');
    }
    if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
    setUploading(false);
    advanceQueue(editing.queue);
  };

  const closeEditor = () => {
    if (!editing) return;
    if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
    advanceQueue(editing.queue);
  };

  const removeImage = (idx: number) => {
    const url = form.images[idx];
    const fullUrl = form.images_full[idx];
    setForm((f) => ({
      ...f,
      images: f.images.filter((_, i) => i !== idx),
      images_full: f.images_full.filter((_, i) => i !== idx),
      // unlink colors that pointed at the removed image
      colors: f.colors.map((c) => (c.image === url ? { ...c, image: null } : c)),
    }));
    // Newly uploaded (unsaved) images → delete their files right away.
    const toFree = [url, fullUrl].filter((u) => u && !isPersisted(u)) as string[];
    if (toFree.length) void removeStorageUrls(toFree);
  };

  /* ───────────── Sizes ───────────── */
  const addSize = (name: string) => {
    const n = name.trim();
    if (!n) return;
    setForm((f) => {
      if (f.sizes.some((s) => s.name === n)) return f;
      return { ...f, sizes: [...f.sizes, { name: n, qty: null, available: true }] };
    });
    setNewSize('');
  };
  const updateSize = (idx: number, patch: Partial<ProductSize>) =>
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  const removeSize = (idx: number) =>
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));

  /* ───────────── Colors ───────────── */
  const addColor = (name: string, hex: string) => {
    const n = name.trim();
    if (!n) return;
    setForm((f) => {
      if (f.colors.some((c) => c.name === n)) return f;
      return { ...f, colors: [...f.colors, { name: n, hex, image: null, available: true }] };
    });
    setNewColorName('');
  };
  const updateColor = (idx: number, patch: Partial<ProductColor>) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  const removeColor = (idx: number) =>
    setForm((f) => ({ ...f, colors: f.colors.filter((_, i) => i !== idx) }));

  const pct = hasDiscount ? discountPercent(Number(form.price), Number(form.compare_at_price)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // discount validation
    const compareAt = hasDiscount ? Number(form.compare_at_price) || null : null;
    if (hasDiscount && (!compareAt || compareAt <= Number(form.price))) {
      setError('السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي');
      setLoading(false);
      return;
    }

    const payload = {
      store_id: storeId,
      title: form.title,
      description: form.description || null,
      price: Number(form.price),
      compare_at_price: compareAt,
      category_id: form.category_id,
      images: form.images,
      images_full: form.images.map((_, i) => form.images_full[i] || ''),
      is_available: form.is_available,
      delivery_type: form.delivery_type,
      delivery_days: form.delivery_type === 'preorder' ? Math.max(1, Number(form.delivery_days) || 1) : null,
      sizes: form.sizes,
      colors: form.colors,
    };

    let res;
    if (initialProduct) {
      res = await supabase.from('products').update(payload).eq('id', initialProduct.id);
    } else {
      res = await supabase.from('products').insert(payload);
    }

    if (res.error) {
      // Helpful hint if migration 0010 hasn't been run yet
      const msg = /compare_at_price|images_full|sizes|colors/.test(res.error.message)
        ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0010) لم يتم تشغيله بعد في Supabase`
        : res.error.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // Storage cleanup: persisted images the user removed in this edit
    // session are now orphaned → physically delete them to free space
    const keep = new Set([...form.images, ...form.images_full]);
    const removedPersisted = [...persistedImages, ...persistedFull].filter((u) => u && !keep.has(u));
    if (removedPersisted.length) {
      await removeStorageUrls(removedPersisted);
    }

    router.push('/dashboard/products');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {/* Real-time crop/zoom/reposition editor */}
      {editing && (
        <ImageEditor
          src={editing.src}
          aspect={1}
          title="تعديل صورة المنتج"
          outputWidth={1000}
          captureOriginal
          onCancel={closeEditor}
          onSave={handleEditorSave}
        />
      )}

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">
          صور المنتج ({form.images.length}/8)
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {form.images.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-luxor-sand group">
              <Image src={img} alt={`img-${i}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                title="حذف"
                className="absolute top-1 end-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
              </button>
              <button
                type="button"
                onClick={() => editExisting(i)}
                title="تعديل الموضع والحجم"
                className="absolute bottom-1 end-1 inline-flex items-center gap-1 bg-luxor-obsidian/70 hover:bg-luxor-obsidian text-white rounded-full px-2 py-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition backdrop-blur"
              >
                <Crop size={11} />
                تعديل
              </button>
            </div>
          ))}
          {form.images.length < 8 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-luxor-sand bg-luxor-sandlight flex flex-col items-center justify-center cursor-pointer hover:border-luxor-gold transition">
              <Upload size={20} className="text-luxor-navy/40 mb-1" />
              <span className="text-xs text-luxor-navy/60">{uploading ? 'جاري الرفع...' : 'إضافة صور'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) pickFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
        <p className="text-xs text-luxor-navy/50 mt-1.5">
          القص يحدد ما يظهر في كارت المنتج — وعند الضغط على الصورة في صفحة المنتج تظهر الصورة الأصلية كاملة بدون قص
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">اسم المنتج *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input-field"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-luxor-navy mb-1">السعر (ج.م) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-luxor-navy mb-1">القسم</label>
          <select
            value={form.category_id ?? ''}
            onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : null })}
            className="input-field"
          >
            <option value="">-- اختر القسم --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ───────── خصم على المنتج ───────── */}
      <div className="rounded-xl border-2 border-luxor-sand p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="has_discount" className="flex items-center gap-2 text-sm font-bold text-luxor-navy cursor-pointer">
            <Percent size={16} className="text-red-500" />
            خصم على المنتج
          </label>
          <input
            type="checkbox"
            id="has_discount"
            checked={hasDiscount}
            onChange={(e) => {
              setHasDiscount(e.target.checked);
              if (!e.target.checked) setForm({ ...form, compare_at_price: null });
            }}
            className="w-4 h-4 accent-luxor-gold"
          />
        </div>
        {hasDiscount && (
          <div className="animate-fade-in space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">السعر قبل الخصم (ج.م) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.compare_at_price ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, compare_at_price: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  className="input-field"
                  placeholder="مثال: 500"
                />
              </div>
              {pct !== null && (
                <div className="shrink-0 text-center">
                  <div className="bg-red-500 text-white rounded-xl px-3 py-2 font-bold text-lg shadow">
                    -{pct}%
                  </div>
                  <div className="text-[10px] text-luxor-navy/50 mt-1">تُحسب تلقائياً</div>
                </div>
              )}
            </div>
            <p className="text-xs text-luxor-navy/50">
              السعر الحالي ({form.price} ج.م) هو السعر بعد الخصم — أدخل السعر الأصلي قبل الخصم وستظهر علامة الخصم تلقائياً على كارت المنتج
            </p>
            {hasDiscount && form.compare_at_price !== null && Number(form.compare_at_price) <= Number(form.price) && (
              <p className="text-xs text-red-600 font-semibold">⚠️ السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي</p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">الوصف</label>
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field"
          placeholder="اكتب وصفاً تفصيلياً للمنتج..."
        />
      </div>

      {/* ───────── المقاسات ───────── */}
      <div className="rounded-xl border-2 border-luxor-sand p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy">
          <Ruler size={16} className="text-luxor-darkgold" />
          المقاسات المتاحة <span className="font-normal text-luxor-navy/50">(اختياري)</span>
        </div>

        {form.sizes.length > 0 && (
          <div className="space-y-2">
            {form.sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-luxor-sandlight rounded-lg p-2">
                <span className="font-bold text-luxor-navy text-sm min-w-[3rem] text-center bg-white rounded-md px-2 py-1 border border-luxor-sand">
                  {s.name}
                </span>
                <input
                  type="number"
                  min="0"
                  value={s.qty ?? ''}
                  onChange={(e) => updateSize(i, { qty: e.target.value ? parseInt(e.target.value) : null })}
                  className="input-field !w-24 !py-1.5 text-center text-sm"
                  placeholder="الكمية"
                  title="الكمية المتاحة (اختياري)"
                />
                <label className="flex items-center gap-1.5 text-xs text-luxor-navy cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={s.available}
                    onChange={(e) => updateSize(i, { available: e.target.checked })}
                    className="w-4 h-4 accent-luxor-gold"
                  />
                  متاح
                </label>
                {!s.available && (
                  <span className="text-[10px] bg-red-100 text-red-600 rounded-full px-2 py-0.5 font-semibold">غير متاح</span>
                )}
                <button
                  type="button"
                  onClick={() => removeSize(i)}
                  className="ms-auto text-red-500 hover:bg-red-50 rounded-full p-1.5"
                  title="حذف المقاس"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSize(newSize);
              }
            }}
            className="input-field !py-2 text-sm"
            placeholder="اكتب المقاس (مثال: M أو 42)"
          />
          <button
            type="button"
            onClick={() => addSize(newSize)}
            className="shrink-0 inline-flex items-center gap-1 bg-luxor-gold/15 hover:bg-luxor-gold/30 text-luxor-darkgold font-bold text-sm rounded-xl px-3 py-2 transition"
          >
            <Plus size={14} /> إضافة
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_SIZES.filter((p) => !form.sizes.some((s) => s.name === p)).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => addSize(p)}
              className="text-xs bg-white border border-luxor-sand hover:border-luxor-gold rounded-full px-2.5 py-1 text-luxor-navy/70 transition"
            >
              + {p}
            </button>
          ))}
        </div>
      </div>

      {/* ───────── الألوان ───────── */}
      <div className="rounded-xl border-2 border-luxor-sand p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy">
          <Palette size={16} className="text-luxor-darkgold" />
          الألوان المتاحة <span className="font-normal text-luxor-navy/50">(اختياري)</span>
        </div>

        {form.colors.length > 0 && (
          <div className="space-y-2">
            {form.colors.map((c, i) => (
              <div key={i} className="bg-luxor-sandlight rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full border-2 border-white shadow shrink-0"
                    style={{ backgroundColor: c.hex || '#999' }}
                  />
                  <span className="font-bold text-luxor-navy text-sm">{c.name}</span>
                  <input
                    type="color"
                    value={c.hex || '#999999'}
                    onChange={(e) => updateColor(i, { hex: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                    title="تغيير درجة اللون"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-luxor-navy cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={c.available !== false}
                      onChange={(e) => updateColor(i, { available: e.target.checked })}
                      className="w-4 h-4 accent-luxor-gold"
                    />
                    متاح
                  </label>
                  <button
                    type="button"
                    onClick={() => removeColor(i)}
                    className="ms-auto text-red-500 hover:bg-red-50 rounded-full p-1.5"
                    title="حذف اللون"
                  >
                    <X size={14} />
                  </button>
                </div>
                {/* ربط اللون بصورة */}
                <div>
                  <div className="text-[11px] text-luxor-navy/60 mb-1.5 flex items-center gap-1">
                    <ImageIcon size={12} />
                    اربط هذا اللون بصورة — عند اختيار اللون ستظهر هذه الصورة للعميل
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => updateColor(i, { image: null })}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-[9px] text-luxor-navy/50 transition ${
                        !c.image ? 'border-luxor-gold bg-luxor-gold/10' : 'border-luxor-sand bg-white'
                      }`}
                    >
                      بدون
                    </button>
                    {form.images.map((img, imgIdx) => (
                      <button
                        key={imgIdx}
                        type="button"
                        onClick={() => updateColor(i, { image: img })}
                        className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                          c.image === img ? 'border-luxor-gold ring-2 ring-luxor-gold/40' : 'border-luxor-sand opacity-70 hover:opacity-100'
                        }`}
                      >
                        <Image src={img} alt={`color-img-${imgIdx}`} fill sizes="48px" className="object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="color"
            value={newColorHex}
            onChange={(e) => setNewColorHex(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-luxor-sand shrink-0"
            title="اختر درجة اللون"
          />
          <input
            type="text"
            value={newColorName}
            onChange={(e) => setNewColorName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addColor(newColorName, newColorHex);
              }
            }}
            className="input-field !py-2 text-sm"
            placeholder="اسم اللون (مثال: أحمر غامق)"
          />
          <button
            type="button"
            onClick={() => addColor(newColorName, newColorHex)}
            className="shrink-0 inline-flex items-center gap-1 bg-luxor-gold/15 hover:bg-luxor-gold/30 text-luxor-darkgold font-bold text-sm rounded-xl px-3 py-2 transition"
          >
            <Plus size={14} /> إضافة
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.filter((p) => !form.colors.some((c) => c.name === p.name)).map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => addColor(p.name, p.hex)}
              className="inline-flex items-center gap-1 text-xs bg-white border border-luxor-sand hover:border-luxor-gold rounded-full ps-1.5 pe-2.5 py-1 text-luxor-navy/70 transition"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: p.hex }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* نوع التوفر: فوري أو حجز مسبق */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">طريقة التوفر *</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, delivery_type: 'instant' })}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
              form.delivery_type === 'instant'
                ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-navy'
                : 'border-luxor-sand bg-white text-luxor-navy/50 hover:border-luxor-gold/50'
            }`}
          >
            <Zap size={18} className={form.delivery_type === 'instant' ? 'text-luxor-darkgold' : ''} />
            متاح فوراً
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, delivery_type: 'preorder' })}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
              form.delivery_type === 'preorder'
                ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-navy'
                : 'border-luxor-sand bg-white text-luxor-navy/50 hover:border-luxor-gold/50'
            }`}
          >
            <CalendarClock size={18} className={form.delivery_type === 'preorder' ? 'text-luxor-darkgold' : ''} />
            حجز مسبق
          </button>
        </div>
        {form.delivery_type === 'preorder' && (
          <div className="mt-3 flex items-center gap-3 bg-luxor-sandlight border border-luxor-sand rounded-xl p-3 animate-fade-in">
            <label htmlFor="delivery_days" className="text-sm font-medium text-luxor-navy whitespace-nowrap">
              يصل خلال
            </label>
            <input
              id="delivery_days"
              type="number"
              min="1"
              max="365"
              required
              value={form.delivery_days}
              onChange={(e) => setForm({ ...form, delivery_days: parseInt(e.target.value) || 1 })}
              className="input-field !w-24 text-center"
            />
            <span className="text-sm font-medium text-luxor-navy">{Number(form.delivery_days) === 1 ? 'يوم' : Number(form.delivery_days) === 2 ? 'يومان' : Number(form.delivery_days) <= 10 ? 'أيام' : 'يوماً'}</span>
          </div>
        )}
        <p className="text-xs text-luxor-navy/50 mt-1.5">
          {form.delivery_type === 'instant'
            ? 'المنتج متوفر وجاهز للتسليم فوراً'
            : 'المنتج يتطلب حجزاً مسبقاً وستظهر مدة الوصول للعميل على كارت المنتج'}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_available"
          checked={form.is_available}
          onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
          className="w-4 h-4 accent-luxor-gold"
        />
        <label htmlFor="is_available" className="text-sm text-luxor-navy">المنتج متاح للبيع</label>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        <Save size={18} />
        {loading ? 'جاري الحفظ...' : initialProduct ? 'حفظ التغييرات' : 'نشر المنتج'}
      </button>
    </form>
  );
}
