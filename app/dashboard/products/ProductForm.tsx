'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, X, Save, Crop, Zap, CalendarClock, Percent, Ruler, Palette, Plus, ImageIcon, HandCoins,
  Truck, Store as StoreIcon2, MapPinned, BadgeCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ImageEditor from '@/components/ImageEditor';
import CroppedImage from '@/components/CroppedImage';
import { checkQuotaBeforeUpload, removeStorageUrls, uploadImage } from '@/lib/storage';
import { discountPercent, depositAmount, formatPrice } from '@/lib/utils';
import type { Brand, Category, FulfillmentOption, ImageCrop, Product, ProductColor, ProductSize } from '@/lib/types';

type EditingState = {
  src: string;
  isObjectUrl: boolean;
  /** index to replace, or null to append. Remaining queue of files to edit after this one */
  replaceIndex: number | null;
  queue: File[];
  /** المصدر مخزّن بالفعل على R2 — إعادة القص تحدّث الـ JSON فقط بدون رفع */
  sourceIsRemote: boolean;
  /** بيانات القص السابقة لاستعادة الوضع في المحرر */
  initialCrop: ImageCrop | null;
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
const PRESET_SIZES = [
  'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL',
  '2', '4', '6', '8', '10', '12', '14', '16', '18', '20',
];

/** خيارات الاستلام المتاحة للعرض في النموذج */
const FULFILLMENT_CHOICES: { value: FulfillmentOption; label: string; Icon: typeof Truck }[] = [
  { value: 'delivery', label: 'توصيل', Icon: Truck },
  { value: 'store_pickup', label: 'استلام من المتجر', Icon: StoreIcon2 },
  { value: 'address_pickup', label: 'استلام من عنوان', Icon: MapPinned },
];

export default function ProductForm({
  storeId,
  userId,
  categories,
  brands = [],
  initialProduct,
}: {
  storeId: string;
  userId: string;
  categories: Category[];
  /** براندات المتجر المسجّلة سابقاً — تظهر كاختيارات جاهزة */
  brands?: Brand[];
  initialProduct?: Product;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    title: initialProduct?.title ?? '',
    brand: initialProduct?.brand ?? '',
    description: initialProduct?.description ?? '',
    // فارغ افتراضياً (وليس 0) حتى لا يلتبس على البائع — يكتب القيمة مباشرة
    price: (initialProduct?.price ?? '') as number | '',
    compare_at_price: initialProduct?.compare_at_price ?? null as number | null,
    category_id: initialProduct?.category_id ?? null as number | null,
    images: initialProduct?.images ?? [] as string[],
    images_full: (initialProduct?.images_full ?? []) as string[],
    images_meta: (initialProduct?.images_meta ?? []) as (ImageCrop | null)[],
    deposit_type: (initialProduct?.deposit_type ?? 'none') as 'none' | 'percent' | 'amount',
    deposit_value: (initialProduct?.deposit_value ?? null) as number | null,
    is_available: initialProduct?.is_available ?? true,
    delivery_type: initialProduct?.delivery_type ?? 'instant' as 'instant' | 'preorder',
    // فارغ افتراضياً (وليس 3) — البائع يكتب عدد الأيام مباشرة
    delivery_days: (initialProduct?.delivery_days ?? '') as number | '',
    sizes: (initialProduct?.sizes ?? []) as ProductSize[],
    colors: (initialProduct?.colors ?? []) as ProductColor[],
    fulfillment_options: (initialProduct?.fulfillment_options ?? []) as FulfillmentOption[],
    pickup_address: initialProduct?.pickup_address ?? '',
  });
  // وضع البراند: اختيار من المسجّل أو إضافة براند جديد
  const initialBrandIsKnown =
    !initialProduct?.brand || brands.some((b) => b.name === initialProduct.brand);
  const [brandMode, setBrandMode] = useState<'select' | 'new'>(
    initialBrandIsKnown ? 'select' : 'new'
  );
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
    setEditing({
      src: URL.createObjectURL(first),
      isObjectUrl: true,
      replaceIndex: null,
      queue: rest,
      sourceIsRemote: false,
      initialCrop: null,
    });
  };

  /**
   * Re-edit an already uploaded image — المصدر هو الصورة الأصلية الوحيدة
   * المخزّنة. إعادة القص تحدّث بيانات JSON فقط — بدون رفع ملف جديد.
   * للمنتجات القديمة (نظام images_full): نفضّل الأصل الكامل كمصدر،
   * وبعد أول إعادة قص تتحول الصورة للنظام الجديد تلقائياً.
   */
  const editExisting = (idx: number) => {
    const src = form.images_full[idx] || form.images[idx];
    setEditing({
      src,
      isObjectUrl: false,
      replaceIndex: idx,
      queue: [],
      sourceIsRemote: true,
      initialCrop: form.images_meta[idx] ?? null,
    });
  };

  const advanceQueue = (queue: File[]) => {
    if (queue.length) {
      const [next, ...rest] = queue;
      setEditing({
        src: URL.createObjectURL(next),
        isObjectUrl: true,
        replaceIndex: null,
        queue: rest,
        sourceIsRemote: false,
        initialCrop: null,
      });
    } else {
      setEditing(null);
    }
  };

  /**
   * النظام الجديد — صورة أصلية واحدة + بيانات قص في قاعدة البيانات:
   *  - صورة جديدة → رفع الأصل مرة واحدة + حفظ القص كـ JSON
   *  - إعادة قص صورة موجودة → تحديث الـ JSON فقط (blob = null، صفر بايت رفع!)
   *  - تدوير صورة موجودة → رفع نسخة مُدارة تحل محل القديمة (ملف واحد أيضاً)
   */
  const handleEditorSaveMeta = async ({ crop, blob }: { crop: ImageCrop; blob: Blob | null }) => {
    if (!editing) return;
    setUploading(true);
    try {
      let publicUrl = '';
      if (blob) {
        // Pre-check the seller's storage quota before uploading
        const quotaError = await checkQuotaBeforeUpload(supabase, blob.size);
        if (quotaError) {
          setError(quotaError);
          if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
          setUploading(false);
          setEditing(null);
          return;
        }
        publicUrl = await uploadImage('product-images', blob);
      }
      const replaceIndex = editing.replaceIndex;
      setForm((f) => {
        if (replaceIndex !== null) {
          const images = [...f.images];
          const imagesMeta = [...f.images_meta];
          const imagesFull = [...f.images_full];
          const old = images[replaceIndex];
          const oldFull = imagesFull[replaceIndex];
          // إذا رُفع ملف جديد (تدوير) → استبدل الرابط؛ وإلا احتفظ بالأصل.
          // للمنتجات القديمة: المصدر كان images_full → نرقّيه ليصبح هو
          // الصورة الأساسية ونحذف النسخة المقصوصة القديمة لتوفير المساحة.
          const newBase = publicUrl || oldFull || old;
          images[replaceIndex] = newBase;
          imagesMeta[replaceIndex] = crop;
          imagesFull[replaceIndex] = ''; // لم نعد نحتاج نسخة ثانية
          // تحرير المساحة: الملفات التي رُفعت في هذه الجلسة ولم تعد مستخدمة
          const toFree: string[] = [];
          if (old && old !== newBase && !isPersisted(old)) toFree.push(old);
          if (oldFull && oldFull !== newBase && !isPersisted(oldFull)) toFree.push(oldFull);
          if (toFree.length) void removeStorageUrls(toFree);
          // re-link any color that pointed at the old image url
          const colors = f.colors.map((c) =>
            c.image === old ? { ...c, image: newBase } : c
          );
          return { ...f, images, images_meta: imagesMeta, images_full: imagesFull, colors };
        }
        // صورة جديدة — ملف واحد فقط + بيانات قص
        const images = [...f.images, publicUrl].slice(0, 8);
        const imagesMeta = [...f.images_meta];
        const imagesFull = [...f.images_full];
        imagesMeta[images.length - 1] = crop;
        imagesFull[images.length - 1] = '';
        return { ...f, images, images_meta: imagesMeta, images_full: imagesFull };
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
      images_meta: f.images_meta.filter((_, i) => i !== idx),
      // unlink colors that pointed at the removed image
      colors: f.colors.map((c) => (c.image === url ? { ...c, image: null } : c)),
    }));
    // Newly uploaded (unsaved) images → delete their files right away.
    const toFree = [url, fullUrl].filter((u) => u && !isPersisted(u)) as string[];
    if (toFree.length) void removeStorageUrls(toFree);
  };

  /* ───────────── Fulfillment ───────────── */
  const toggleFulfillment = (opt: FulfillmentOption) =>
    setForm((f) => ({
      ...f,
      fulfillment_options: f.fulfillment_options.includes(opt)
        ? f.fulfillment_options.filter((o) => o !== opt)
        : [...f.fulfillment_options, opt],
    }));

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

    // price required (empty field guard)
    if (form.price === '' || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('أدخل سعراً صحيحاً للمنتج');
      setLoading(false);
      return;
    }

    // discount validation
    const compareAt = hasDiscount ? Number(form.compare_at_price) || null : null;
    if (hasDiscount && (!compareAt || compareAt <= Number(form.price))) {
      setError('السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي');
      setLoading(false);
      return;
    }

    // fulfillment validation
    if (
      form.fulfillment_options.includes('address_pickup') &&
      !form.pickup_address.trim()
    ) {
      setError('أدخل عنوان الاستلام عند اختيار "استلام من عنوان"');
      setLoading(false);
      return;
    }

    // deposit validation
    const depositValue = form.deposit_type === 'none' ? null : Number(form.deposit_value) || null;
    if (form.deposit_type !== 'none') {
      if (!depositValue || depositValue <= 0) {
        setError('أدخل قيمة صحيحة للدفع المقدم');
        setLoading(false);
        return;
      }
      if (form.deposit_type === 'percent' && depositValue > 100) {
        setError('نسبة الدفع المقدم لا يمكن أن تتجاوز 100%');
        setLoading(false);
        return;
      }
      if (form.deposit_type === 'amount' && depositValue >= Number(form.price)) {
        setError('مبلغ الدفع المقدم يجب أن يكون أقل من سعر المنتج');
        setLoading(false);
        return;
      }
    }

    const brandName = form.brand.trim();

    const payload = {
      store_id: storeId,
      title: form.title,
      brand: brandName || null,
      description: form.description || null,
      price: Number(form.price),
      compare_at_price: compareAt,
      category_id: form.category_id,
      images: form.images,
      images_full: form.images.map((_, i) => form.images_full[i] || ''),
      images_meta: form.images.map((_, i) => form.images_meta[i] ?? null),
      deposit_type: form.deposit_type,
      deposit_value: depositValue,
      is_available: form.is_available,
      delivery_type: form.delivery_type,
      delivery_days:
        form.delivery_type === 'preorder'
          ? Math.max(1, Number(form.delivery_days) || 1)
          : null,
      sizes: form.sizes,
      colors: form.colors,
      fulfillment_options: form.fulfillment_options,
      pickup_address: form.fulfillment_options.includes('address_pickup')
        ? form.pickup_address.trim() || null
        : null,
    };

    let res;
    if (initialProduct) {
      res = await supabase.from('products').update(payload).eq('id', initialProduct.id);
    } else {
      res = await supabase.from('products').insert(payload);
    }

    if (res.error) {
      // Helpful hint if a migration hasn't been run yet
      const msg = /brand|fulfillment_options|pickup_address/.test(res.error.message)
        ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0012) لم يتم تشغيله بعد في Supabase`
        : /images_meta|deposit_type|deposit_value/.test(res.error.message)
          ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0011) لم يتم تشغيله بعد في Supabase`
          : /compare_at_price|images_full|sizes|colors/.test(res.error.message)
            ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0010) لم يتم تشغيله بعد في Supabase`
            : res.error.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // تسجيل البراند الجديد في سجل براندات المتجر — يظهر كاختيار
    // جاهز في المرات القادمة (لا تكرار بفضل unique(store_id, name))
    if (brandName && !brands.some((b) => b.name === brandName)) {
      try {
        await supabase
          .from('brands')
          .upsert({ store_id: storeId, name: brandName }, { onConflict: 'store_id,name', ignoreDuplicates: true });
      } catch {
        /* جدول البراندات غير مثبت بعد (0012) — المنتج محفوظ بالفعل، لا نعطل */
      }
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
          metaMode
          sourceIsRemote={editing.sourceIsRemote}
          initialCrop={editing.initialCrop}
          onCancel={closeEditor}
          onSaveMeta={handleEditorSaveMeta}
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
              <CroppedImage src={img} crop={form.images_meta[i]} alt={`img-${i}`} sizes="120px" />
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
          القص يحدد ما يظهر في كارت المنتج — تُحفظ الصورة الأصلية مرة واحدة فقط ويُطبّق القص تلقائياً بدون استهلاك مساحة إضافية، وعند التكبير تظهر الصورة كاملة
        </p>
      </div>

      {/* ───────── البراند ───────── */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-luxor-navy mb-1">
          <BadgeCheck size={15} className="text-luxor-darkgold" />
          البراند <span className="font-normal text-luxor-navy/50">(اختياري)</span>
        </label>
        {brandMode === 'select' ? (
          <div className="flex items-center gap-2">
            <select
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="input-field"
            >
              <option value="">-- بدون براند --</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
              {/* براند محفوظ على المنتج لكنه غير موجود في السجل (حُذف مثلاً) */}
              {form.brand && !brands.some((b) => b.name === form.brand) && (
                <option value={form.brand}>{form.brand}</option>
              )}
            </select>
            <button
              type="button"
              onClick={() => {
                setBrandMode('new');
                setForm({ ...form, brand: '' });
              }}
              className="shrink-0 inline-flex items-center gap-1 bg-luxor-gold/15 hover:bg-luxor-gold/30 text-luxor-darkgold font-bold text-sm rounded-xl px-3 py-2.5 transition whitespace-nowrap"
            >
              <Plus size={14} /> براند جديد
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="input-field"
              placeholder="اكتب اسم البراند الجديد (مثال: Nike)"
            />
            {brands.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setBrandMode('select');
                  setForm({ ...form, brand: '' });
                }}
                className="shrink-0 text-sm font-semibold text-luxor-navy/60 hover:text-luxor-darkgold border border-luxor-sand hover:border-luxor-gold rounded-xl px-3 py-2.5 transition whitespace-nowrap"
              >
                اختر من المسجّل
              </button>
            )}
          </div>
        )}
        <p className="text-xs text-luxor-navy/50 mt-1">
          {brandMode === 'new'
            ? 'البراند الجديد سيُسجّل تلقائياً على متجرك وسيظهر كاختيار جاهز في المرات القادمة'
            : 'اختر برانداً مسجّلاً على متجرك أو أضف برانداً جديداً'}
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
            onChange={(e) =>
              setForm({ ...form, price: e.target.value === '' ? '' : parseFloat(e.target.value) })
            }
            className="input-field"
            placeholder="أدخل السعر"
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
              السعر الحالي ({form.price || 0} ج.م) هو السعر بعد الخصم — أدخل السعر الأصلي قبل الخصم وستظهر علامة الخصم تلقائياً على كارت المنتج
            </p>
            {hasDiscount && form.compare_at_price !== null && Number(form.compare_at_price) <= Number(form.price) && (
              <p className="text-xs text-red-600 font-semibold">⚠️ السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي</p>
            )}
          </div>
        )}
      </div>

      {/* ───────── الدفع المقدم (العربون) ───────── */}
      <div className="rounded-xl border-2 border-luxor-sand p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label htmlFor="has_deposit" className="flex items-center gap-2 text-sm font-bold text-luxor-navy cursor-pointer">
            <HandCoins size={16} className="text-luxor-darkgold" />
            دفع مقدم (عربون)
          </label>
          <input
            type="checkbox"
            id="has_deposit"
            checked={form.deposit_type !== 'none'}
            onChange={(e) =>
              setForm({
                ...form,
                deposit_type: e.target.checked ? 'percent' : 'none',
                deposit_value: e.target.checked ? form.deposit_value : null,
              })
            }
            className="w-4 h-4 accent-luxor-gold"
          />
        </div>
        {form.deposit_type !== 'none' && (
          <div className="animate-fade-in space-y-3">
            {/* نوع العربون: نسبة مئوية أو مبلغ ثابت */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, deposit_type: 'percent' })}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                  form.deposit_type === 'percent'
                    ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-navy'
                    : 'border-luxor-sand bg-white text-luxor-navy/50 hover:border-luxor-gold/50'
                }`}
              >
                <Percent size={16} className={form.deposit_type === 'percent' ? 'text-luxor-darkgold' : ''} />
                نسبة مئوية %
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, deposit_type: 'amount' })}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-bold transition ${
                  form.deposit_type === 'amount'
                    ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-navy'
                    : 'border-luxor-sand bg-white text-luxor-navy/50 hover:border-luxor-gold/50'
                }`}
              >
                <HandCoins size={16} className={form.deposit_type === 'amount' ? 'text-luxor-darkgold' : ''} />
                مبلغ ثابت (ج.م)
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-luxor-navy/70 mb-1">
                  {form.deposit_type === 'percent' ? 'نسبة الدفع المقدم (%) *' : 'مبلغ الدفع المقدم (ج.م) *'}
                </label>
                <input
                  type="number"
                  min="0.01"
                  max={form.deposit_type === 'percent' ? 100 : undefined}
                  step="0.01"
                  required
                  value={form.deposit_value ?? ''}
                  onChange={(e) =>
                    setForm({ ...form, deposit_value: e.target.value ? parseFloat(e.target.value) : null })
                  }
                  className="input-field"
                  placeholder={form.deposit_type === 'percent' ? 'مثال: 25' : 'مثال: 100'}
                />
              </div>
              {(() => {
                const amt = depositAmount(Number(form.price), form.deposit_type, form.deposit_value);
                if (amt === null) return null;
                return (
                  <div className="shrink-0 text-center">
                    <div className="bg-luxor-gold/15 border border-luxor-gold text-luxor-darkgold rounded-xl px-3 py-2 font-bold text-sm shadow-sm whitespace-nowrap">
                      {formatPrice(amt)} ج.م
                    </div>
                    <div className="text-[10px] text-luxor-navy/50 mt-1">قيمة العربون</div>
                  </div>
                );
              })()}
            </div>
            <p className="text-xs text-luxor-navy/50">
              سيظهر للعميل أن المنتج يتطلب دفعاً مقدماً، وستُضاف قيمة العربون تلقائياً في رسالة الطلب على واتساب
            </p>
            {form.deposit_type === 'percent' && form.deposit_value !== null && Number(form.deposit_value) > 100 && (
              <p className="text-xs text-red-600 font-semibold">⚠️ النسبة لا يمكن أن تتجاوز 100%</p>
            )}
            {form.deposit_type === 'amount' && form.deposit_value !== null && Number(form.deposit_value) >= Number(form.price) && Number(form.price) > 0 && (
              <p className="text-xs text-red-600 font-semibold">⚠️ مبلغ العربون يجب أن يكون أقل من سعر المنتج</p>
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
                        <CroppedImage src={img} crop={form.images_meta[imgIdx]} alt={`color-img-${imgIdx}`} sizes="48px" />
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

      {/* ───────── خيارات الاستلام ───────── */}
      <div className="rounded-xl border-2 border-luxor-sand p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-luxor-navy">
          <Truck size={16} className="text-luxor-darkgold" />
          خيارات الاستلام <span className="font-normal text-luxor-navy/50">(اختر واحداً أو أكثر)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FULFILLMENT_CHOICES.map(({ value, label, Icon }) => {
            const active = form.fulfillment_options.includes(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleFulfillment(value)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition ${
                  active
                    ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-navy'
                    : 'border-luxor-sand bg-white text-luxor-navy/50 hover:border-luxor-gold/50'
                }`}
              >
                <Icon size={18} className={active ? 'text-luxor-darkgold' : ''} />
                {label}
              </button>
            );
          })}
        </div>
        {form.fulfillment_options.includes('address_pickup') && (
          <div className="animate-fade-in">
            <label className="block text-xs font-medium text-luxor-navy/70 mb-1">عنوان الاستلام *</label>
            <input
              type="text"
              required
              value={form.pickup_address}
              onChange={(e) => setForm({ ...form, pickup_address: e.target.value })}
              className="input-field"
              placeholder="مثال: شارع المحطة — بجوار مسجد النور — الأقصر"
            />
          </div>
        )}
        <p className="text-xs text-luxor-navy/50">
          ستظهر خيارات الاستلام للعميل على صفحة المنتج وستُضاف في رسالة الطلب على واتساب
        </p>
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
              onChange={(e) =>
                setForm({ ...form, delivery_days: e.target.value === '' ? '' : parseInt(e.target.value) })
              }
              className="input-field !w-24 text-center"
              placeholder="عدد"
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
