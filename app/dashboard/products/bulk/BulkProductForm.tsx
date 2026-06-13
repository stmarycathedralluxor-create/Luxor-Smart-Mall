'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, X, Save, Copy, Trash2, Upload, Zap, CalendarClock, Palette, Truck,
  Store as StoreIcon2, MapPinned, Wand2, CheckCircle2, HandCoins, Percent,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ImageEditor from '@/components/ImageEditor';
import CroppedImage from '@/components/CroppedImage';
import { checkQuotaBeforeUpload, removeStorageUrls, uploadImage } from '@/lib/storage';
import { discountPercent, depositAmount, formatPrice } from '@/lib/utils';
import type { Brand, Category, FulfillmentOption, ImageCrop, ProductColor, ProductSize } from '@/lib/types';

/** ألوان جاهزة شائعة */
const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: 'أسود', hex: '#1a1a1a' }, { name: 'أبيض', hex: '#f5f5f5' }, { name: 'أحمر', hex: '#dc2626' },
  { name: 'أزرق', hex: '#2563eb' }, { name: 'أخضر', hex: '#16a34a' }, { name: 'أصفر', hex: '#eab308' },
  { name: 'بني', hex: '#92400e' }, { name: 'رمادي', hex: '#6b7280' }, { name: 'بيج', hex: '#d6c7a1' },
  { name: 'ذهبي', hex: '#D4AF37' }, { name: 'كحلي', hex: '#1e3a5f' },
];
const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44'];
const FULFILLMENT_CHOICES: { value: FulfillmentOption; label: string; Icon: typeof Truck }[] = [
  { value: 'delivery', label: 'توصيل', Icon: Truck },
  { value: 'store_pickup', label: 'استلام من المتجر', Icon: StoreIcon2 },
  { value: 'address_pickup', label: 'استلام من عنوان', Icon: MapPinned },
];

type Row = {
  /** local row id */
  rid: string;
  title: string;
  brand: string;
  description: string;
  price: number | '';
  compare_at_price: number | '';
  category_id: number | null;
  images: string[];
  images_meta: (ImageCrop | null)[];
  is_available: boolean;
  delivery_type: 'instant' | 'preorder';
  delivery_days: number | '';
  /** الدفع المقدم (العربون) */
  deposit_type: 'none' | 'percent' | 'amount';
  deposit_value: number | '';
  sizes: ProductSize[];
  colors: ProductColor[];
  fulfillment_options: FulfillmentOption[];
  pickup_address: string;
};

let _rid = 0;
const newRow = (): Row => ({
  rid: `r${++_rid}-${Date.now()}`,
  title: '', brand: '', description: '', price: '', compare_at_price: '',
  category_id: null, images: [], images_meta: [], is_available: true,
  delivery_type: 'instant', delivery_days: '',
  deposit_type: 'none', deposit_value: '',
  sizes: [], colors: [],
  fulfillment_options: [], pickup_address: '',
});

type EditingState = { rid: string; src: string; queue: File[] } | null;

export default function BulkProductForm({
  storeId,
  userId,
  categories,
  brands = [],
}: {
  storeId: string;
  userId: string;
  categories: Category[];
  brands?: Brand[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<Row[]>([newRow(), newRow()]);
  const [editing, setEditing] = useState<EditingState>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const patchRow = (rid: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.rid === rid ? { ...r, ...patch } : r)));

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const duplicateRow = (rid: string) =>
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.rid === rid);
      if (idx === -1) return rs;
      const clone: Row = {
        ...rs[idx],
        rid: `r${++_rid}-${Date.now()}`,
        // don't clone images (each product keeps its own files)
        images: [],
        images_meta: [],
      };
      const copy = [...rs];
      copy.splice(idx + 1, 0, clone);
      return copy;
    });
  const removeRow = (rid: string) =>
    setRows((rs) => {
      const r = rs.find((x) => x.rid === rid);
      if (r) {
        const toFree = r.images.filter(Boolean);
        if (toFree.length) void removeStorageUrls(toFree);
      }
      const next = rs.filter((x) => x.rid !== rid);
      return next.length ? next : [newRow()];
    });

  /* ───────── Images (per row) ───────── */
  const pickFiles = (rid: string, files: FileList) => {
    const row = rows.find((r) => r.rid === rid);
    if (!row) return;
    const list = Array.from(files).slice(0, 8 - row.images.length);
    if (!list.length) return;
    const [first, ...rest] = list;
    setEditing({ rid, src: URL.createObjectURL(first), queue: rest });
  };

  const advanceQueue = (rid: string, queue: File[]) => {
    if (queue.length) {
      const [next, ...rest] = queue;
      setEditing({ rid, src: URL.createObjectURL(next), queue: rest });
    } else {
      setEditing(null);
    }
  };

  const handleEditorSaveMeta = async ({ crop, blob }: { crop: ImageCrop; blob: Blob | null }) => {
    if (!editing) return;
    const { rid, src, queue } = editing;
    setUploading(true);
    try {
      if (blob) {
        const quotaError = await checkQuotaBeforeUpload(supabase, blob.size);
        if (quotaError) {
          setError(quotaError);
          URL.revokeObjectURL(src);
          setUploading(false);
          setEditing(null);
          return;
        }
        const url = await uploadImage('product-images', blob);
        setRows((rs) =>
          rs.map((r) =>
            r.rid === rid
              ? {
                  ...r,
                  images: [...r.images, url].slice(0, 8),
                  images_meta: [...r.images_meta, crop].slice(0, 8),
                }
              : r
          )
        );
      }
    } catch (err: any) {
      setError(err?.message || 'فشل رفع الصورة');
    }
    URL.revokeObjectURL(src);
    setUploading(false);
    advanceQueue(rid, queue);
  };

  const closeEditor = () => {
    if (editing) URL.revokeObjectURL(editing.src);
    advanceQueue(editing!.rid, editing!.queue);
  };

  const removeImage = (rid: string, idx: number) => {
    const row = rows.find((r) => r.rid === rid);
    const url = row?.images[idx];
    patchRow(rid, {
      images: row!.images.filter((_, i) => i !== idx),
      images_meta: row!.images_meta.filter((_, i) => i !== idx),
    });
    if (url) void removeStorageUrls([url]);
  };

  /* ───────── Per-row sizes / colors / fulfillment ───────── */
  const toggleSize = (rid: string, name: string) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.rid !== rid) return r;
        const exists = r.sizes.some((s) => s.name === name);
        return {
          ...r,
          sizes: exists
            ? r.sizes.filter((s) => s.name !== name)
            : [...r.sizes, { name, qty: null, available: true }],
        };
      })
    );
  const toggleColor = (rid: string, c: { name: string; hex: string }) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.rid !== rid) return r;
        const exists = r.colors.some((x) => x.name === c.name);
        return {
          ...r,
          colors: exists
            ? r.colors.filter((x) => x.name !== c.name)
            : [...r.colors, { name: c.name, hex: c.hex, image: null, available: true }],
        };
      })
    );
  const toggleFulfillment = (rid: string, opt: FulfillmentOption) =>
    setRows((rs) =>
      rs.map((r) => {
        if (r.rid !== rid) return r;
        return {
          ...r,
          fulfillment_options: r.fulfillment_options.includes(opt)
            ? r.fulfillment_options.filter((o) => o !== opt)
            : [...r.fulfillment_options, opt],
        };
      })
    );

  /* ───────── Apply-to-all (bulk) controls ───────── */
  const applyAll = (patch: Partial<Row>) => setRows((rs) => rs.map((r) => ({ ...r, ...patch })));
  const applyAllColors = (colors: ProductColor[]) => setRows((rs) => rs.map((r) => ({ ...r, colors: [...colors] })));
  const applyAllSizes = (sizes: ProductSize[]) => setRows((rs) => rs.map((r) => ({ ...r, sizes: [...sizes] })));

  // bulk panel local state
  const [bulkCategory, setBulkCategory] = useState<number | ''>('');
  const [bulkBrand, setBulkBrand] = useState('');
  const [bulkDelivery, setBulkDelivery] = useState<'' | 'instant' | 'preorder'>('');
  const [bulkDays, setBulkDays] = useState<number | ''>('');
  const [bulkDepositType, setBulkDepositType] = useState<'none' | 'percent' | 'amount'>('none');
  const [bulkDepositValue, setBulkDepositValue] = useState<number | ''>('');
  const [bulkColors, setBulkColors] = useState<ProductColor[]>([]);
  const [bulkSizes, setBulkSizes] = useState<ProductSize[]>([]);
  const [bulkFulfillment, setBulkFulfillment] = useState<FulfillmentOption[]>([]);
  const [bulkPickupAddress, setBulkPickupAddress] = useState('');

  const toggleBulkColor = (c: { name: string; hex: string }) =>
    setBulkColors((cs) =>
      cs.some((x) => x.name === c.name)
        ? cs.filter((x) => x.name !== c.name)
        : [...cs, { name: c.name, hex: c.hex, image: null, available: true }]
    );
  const toggleBulkSize = (name: string) =>
    setBulkSizes((ss) =>
      ss.some((s) => s.name === name)
        ? ss.filter((s) => s.name !== name)
        : [...ss, { name, qty: null, available: true }]
    );
  const toggleBulkFulfillment = (opt: FulfillmentOption) =>
    setBulkFulfillment((fs) => (fs.includes(opt) ? fs.filter((o) => o !== opt) : [...fs, opt]));

  /* ───────── Submit all rows ───────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedCount(null);

    // keep only rows the seller actually filled (title + valid price)
    const filled = rows.filter((r) => r.title.trim() && r.price !== '' && Number(r.price) >= 0);
    if (!filled.length) {
      setError('أضف منتجاً واحداً على الأقل باسم وسعر صحيحين');
      return;
    }

    // validation per row
    for (const r of filled) {
      if (r.compare_at_price !== '' && Number(r.compare_at_price) <= Number(r.price)) {
        setError(`المنتج "${r.title}": السعر قبل الخصم يجب أن يكون أكبر من السعر`);
        return;
      }
      if (r.fulfillment_options.includes('address_pickup') && !r.pickup_address.trim()) {
        setError(`المنتج "${r.title}": أدخل عنوان الاستلام`);
        return;
      }
      // deposit validation
      if (r.deposit_type !== 'none') {
        const dv = Number(r.deposit_value);
        if (!dv || dv <= 0) {
          setError(`المنتج "${r.title}": أدخل قيمة صحيحة للدفع المقدم`);
          return;
        }
        if (r.deposit_type === 'percent' && dv > 100) {
          setError(`المنتج "${r.title}": نسبة الدفع المقدم لا يمكن أن تتجاوز 100%`);
          return;
        }
        if (r.deposit_type === 'amount' && dv >= Number(r.price)) {
          setError(`المنتج "${r.title}": مبلغ الدفع المقدم يجب أن يكون أقل من سعر المنتج`);
          return;
        }
      }
    }

    setLoading(true);

    const payloads = filled.map((r) => ({
      store_id: storeId,
      title: r.title.trim(),
      brand: r.brand.trim() || null,
      description: r.description.trim() || null,
      price: Number(r.price),
      compare_at_price: r.compare_at_price === '' ? null : Number(r.compare_at_price),
      category_id: r.category_id,
      images: r.images,
      images_full: r.images.map(() => ''),
      images_meta: r.images.map((_, i) => r.images_meta[i] ?? null),
      deposit_type: r.deposit_type,
      deposit_value: r.deposit_type === 'none' ? null : Number(r.deposit_value) || null,
      is_available: r.is_available,
      delivery_type: r.delivery_type,
      delivery_days:
        r.delivery_type === 'preorder' ? Math.max(1, Number(r.delivery_days) || 1) : null,
      sizes: r.sizes,
      colors: r.colors,
      fulfillment_options: r.fulfillment_options,
      pickup_address: r.fulfillment_options.includes('address_pickup')
        ? r.pickup_address.trim() || null
        : null,
    }));

    const { error: insErr } = await supabase.from('products').insert(payloads);
    if (insErr) {
      const msg = /brand|fulfillment_options|pickup_address/.test(insErr.message)
        ? `${insErr.message} — يبدو أن تحديث قاعدة البيانات (0012) لم يُشغّل بعد`
        : insErr.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // register any new brands used (best-effort)
    const newBrands = Array.from(
      new Set(filled.map((r) => r.brand.trim()).filter((b) => b && !brands.some((x) => x.name === b)))
    );
    if (newBrands.length) {
      try {
        await supabase
          .from('brands')
          .upsert(
            newBrands.map((name) => ({ store_id: storeId, name })),
            { onConflict: 'store_id,name', ignoreDuplicates: true }
          );
      } catch {
        /* brands table not installed — ignore */
      }
    }

    setSavedCount(filled.length);
    setLoading(false);
    router.push('/dashboard/products');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {editing && (
        <ImageEditor
          src={editing.src}
          aspect={1}
          title="تعديل صورة المنتج"
          outputWidth={1000}
          metaMode
          sourceIsRemote={false}
          initialCrop={null}
          onCancel={closeEditor}
          onSaveMeta={handleEditorSaveMeta}
        />
      )}

      {/* ───────── Apply-to-all panel ───────── */}
      <div className="card p-5 border-2 border-luxor-gold/30 bg-luxor-gold/[0.03]">
        <div className="flex items-center gap-2 font-bold text-luxor-navy mb-3">
          <Wand2 size={18} className="text-luxor-darkgold" />
          تطبيق معلومة على كل المنتجات
        </div>
        <p className="text-xs text-luxor-navy/60 mb-4">
          اختر القيمة ثم اضغط «تطبيق على الكل» — ستُطبَّق على كل الصفوف دفعة واحدة.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Category */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-luxor-navy/70 mb-1">القسم</label>
              <select
                value={bulkCategory}
                onChange={(e) => setBulkCategory(e.target.value ? Number(e.target.value) : '')}
                className="input-field !py-2 text-sm"
              >
                <option value="">-- اختر القسم --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => applyAll({ category_id: bulkCategory === '' ? null : bulkCategory })}
              className="shrink-0 bg-luxor-gold/15 hover:bg-luxor-gold/30 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2.5 transition"
            >
              تطبيق على الكل
            </button>
          </div>

          {/* Brand */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-luxor-navy/70 mb-1">البراند</label>
              <input
                list="bulk-brands"
                value={bulkBrand}
                onChange={(e) => setBulkBrand(e.target.value)}
                className="input-field !py-2 text-sm"
                placeholder="اسم البراند"
              />
              <datalist id="bulk-brands">
                {brands.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </div>
            <button
              type="button"
              onClick={() => applyAll({ brand: bulkBrand })}
              className="shrink-0 bg-luxor-gold/15 hover:bg-luxor-gold/30 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2.5 transition"
            >
              تطبيق على الكل
            </button>
          </div>

          {/* Delivery type — كلا الخيارين ظاهران جنباً إلى جنب */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-luxor-navy/70 mb-1">طريقة التوفر</label>
              <div className="flex gap-2">
                <div className="grid grid-cols-2 gap-1.5 flex-1">
                  <button
                    type="button"
                    onClick={() => setBulkDelivery('instant')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${
                      bulkDelivery === 'instant'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-luxor-sand bg-white text-luxor-navy/60 hover:border-emerald-300'
                    }`}
                  >
                    <Zap size={13} /> متاح فوراً
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDelivery('preorder')}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${
                      bulkDelivery === 'preorder'
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-luxor-sand bg-white text-luxor-navy/60 hover:border-amber-300'
                    }`}
                  >
                    <CalendarClock size={13} /> حجز مسبق
                  </button>
                </div>
                {bulkDelivery === 'preorder' && (
                  <input
                    type="number"
                    min="1"
                    value={bulkDays}
                    onChange={(e) => setBulkDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="input-field !py-2 !w-20 text-center text-sm"
                    placeholder="أيام"
                  />
                )}
              </div>
            </div>
            <button
              type="button"
              disabled={!bulkDelivery}
              onClick={() =>
                applyAll({
                  delivery_type: (bulkDelivery || 'instant') as 'instant' | 'preorder',
                  delivery_days: bulkDelivery === 'preorder' ? bulkDays : '',
                })
              }
              className="shrink-0 bg-luxor-gold/15 hover:bg-luxor-gold/30 disabled:opacity-40 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2.5 transition"
            >
              تطبيق على الكل
            </button>
          </div>

          {/* Availability */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-luxor-navy/70 mb-1">حالة التوفر</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyAll({ is_available: true })}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-luxor-sand bg-white text-luxor-navy text-xs font-bold px-3 py-2.5 hover:border-emerald-400 transition"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" /> الكل متاح
                </button>
                <button
                  type="button"
                  onClick={() => applyAll({ is_available: false })}
                  className="flex-1 rounded-xl border-2 border-luxor-sand bg-white text-luxor-navy text-xs font-bold px-3 py-2.5 hover:border-red-400 transition"
                >
                  الكل غير متاح
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Colors apply-to-all */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-luxor-navy/70 mb-1.5">
            <Palette size={14} className="text-luxor-darkgold" /> الألوان
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_COLORS.map((p) => {
              const active = bulkColors.some((c) => c.name === p.name);
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => toggleBulkColor(p)}
                  className={`inline-flex items-center gap-1 text-xs rounded-full ps-1.5 pe-2.5 py-1 border transition ${
                    active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/70'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-black/10" style={{ backgroundColor: p.hex }} />
                  {p.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!bulkColors.length}
            onClick={() => applyAllColors(bulkColors)}
            className="bg-luxor-gold/15 hover:bg-luxor-gold/30 disabled:opacity-40 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2 transition"
          >
            تطبيق الألوان على الكل
          </button>
        </div>

        {/* Sizes apply-to-all */}
        <div className="mt-4">
          <label className="text-xs font-medium text-luxor-navy/70 mb-1.5 block">المقاسات</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESET_SIZES.map((s) => {
              const active = bulkSizes.some((x) => x.name === s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleBulkSize(s)}
                  className={`text-xs rounded-full px-2.5 py-1 border transition ${
                    active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/70'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={!bulkSizes.length}
            onClick={() => applyAllSizes(bulkSizes)}
            className="bg-luxor-gold/15 hover:bg-luxor-gold/30 disabled:opacity-40 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2 transition"
          >
            تطبيق المقاسات على الكل
          </button>
        </div>

        {/* Fulfillment apply-to-all */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-luxor-navy/70 mb-1.5">
            <Truck size={14} className="text-luxor-darkgold" /> خيارات الاستلام
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {FULFILLMENT_CHOICES.map(({ value, label, Icon }) => {
              const active = bulkFulfillment.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleBulkFulfillment(value)}
                  className={`inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 border transition ${
                    active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/70'
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              );
            })}
          </div>
          {bulkFulfillment.includes('address_pickup') && (
            <input
              value={bulkPickupAddress}
              onChange={(e) => setBulkPickupAddress(e.target.value)}
              className="input-field !py-2 text-sm mb-2"
              placeholder="عنوان الاستلام المشترك"
            />
          )}
          <button
            type="button"
            disabled={!bulkFulfillment.length}
            onClick={() => applyAll({ fulfillment_options: [...bulkFulfillment], pickup_address: bulkPickupAddress })}
            className="bg-luxor-gold/15 hover:bg-luxor-gold/30 disabled:opacity-40 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2 transition"
          >
            تطبيق طرق الاستلام على الكل
          </button>
        </div>

        {/* Deposit (الدفع المقدم) apply-to-all */}
        <div className="mt-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-luxor-navy/70 mb-1.5">
            <HandCoins size={14} className="text-luxor-darkgold" /> الدفع المقدم (العربون)
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setBulkDepositType('none')}
                className={`text-xs rounded-xl px-3 py-2 border-2 font-bold transition ${
                  bulkDepositType === 'none' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                }`}
              >
                بدون
              </button>
              <button
                type="button"
                onClick={() => setBulkDepositType('percent')}
                className={`inline-flex items-center justify-center gap-1 text-xs rounded-xl px-3 py-2 border-2 font-bold transition ${
                  bulkDepositType === 'percent' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                }`}
              >
                <Percent size={12} /> نسبة %
              </button>
              <button
                type="button"
                onClick={() => setBulkDepositType('amount')}
                className={`inline-flex items-center justify-center gap-1 text-xs rounded-xl px-3 py-2 border-2 font-bold transition ${
                  bulkDepositType === 'amount' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                }`}
              >
                <HandCoins size={12} /> مبلغ
              </button>
            </div>
            {bulkDepositType !== 'none' && (
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={bulkDepositType === 'percent' ? 100 : undefined}
                value={bulkDepositValue}
                onChange={(e) => setBulkDepositValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="input-field !py-2 !w-32 text-sm"
                placeholder={bulkDepositType === 'percent' ? 'النسبة %' : 'المبلغ ج.م'}
              />
            )}
          </div>
          <button
            type="button"
            disabled={bulkDepositType !== 'none' && (!bulkDepositValue || Number(bulkDepositValue) <= 0)}
            onClick={() =>
              applyAll({
                deposit_type: bulkDepositType,
                deposit_value: bulkDepositType === 'none' ? '' : bulkDepositValue,
              })
            }
            className="bg-luxor-gold/15 hover:bg-luxor-gold/30 disabled:opacity-40 text-luxor-darkgold font-bold text-xs rounded-xl px-3 py-2 transition"
          >
            تطبيق الدفع المقدم على الكل
          </button>
        </div>
      </div>

      {/* ───────── Rows (one card per product) ───────── */}
      <div className="space-y-4">
        {rows.map((r, idx) => {
          const pct = r.compare_at_price !== '' ? discountPercent(Number(r.price), Number(r.compare_at_price)) : null;
          return (
            <div key={r.rid} className="card p-4 border border-luxor-sand">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-luxor-gold/15 text-luxor-darkgold font-bold text-sm">
                  {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => duplicateRow(r.rid)}
                    title="تكرار الصف"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-luxor-navy/60 hover:text-luxor-darkgold border border-luxor-sand rounded-lg px-2.5 py-1.5 transition"
                  >
                    <Copy size={13} /> تكرار
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(r.rid)}
                    title="حذف الصف"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 transition"
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Images */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-3 gap-1.5">
                    {r.images.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-luxor-sand group">
                        <CroppedImage src={img} crop={r.images_meta[i]} alt={`img-${i}`} sizes="80px" />
                        <button
                          type="button"
                          onClick={() => removeImage(r.rid, i)}
                          className="absolute top-0.5 end-0.5 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {r.images.length < 8 && (
                      <label className="aspect-square rounded-lg border-2 border-dashed border-luxor-sand bg-luxor-sandlight flex flex-col items-center justify-center cursor-pointer hover:border-luxor-gold transition">
                        <Upload size={16} className="text-luxor-navy/40" />
                        <span className="text-[9px] text-luxor-navy/60">{uploading ? '...' : 'صور'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) pickFiles(r.rid, e.target.files);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Core fields */}
                <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      value={r.title}
                      onChange={(e) => patchRow(r.rid, { title: e.target.value })}
                      className="input-field !py-2 text-sm font-semibold"
                      placeholder="اسم المنتج *"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.price}
                      onChange={(e) => patchRow(r.rid, { price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="input-field !py-2 text-sm"
                      placeholder="السعر (ج.م) *"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={r.compare_at_price}
                      onChange={(e) => patchRow(r.rid, { compare_at_price: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      className="input-field !py-2 text-sm flex-1"
                      placeholder="السعر قبل الخصم"
                    />
                    {pct !== null && (
                      <span className="shrink-0 bg-red-500 text-white rounded-lg px-2 py-1 text-xs font-bold" dir="ltr">-{pct}%</span>
                    )}
                  </div>
                  <div>
                    <select
                      value={r.category_id ?? ''}
                      onChange={(e) => patchRow(r.rid, { category_id: e.target.value ? Number(e.target.value) : null })}
                      className="input-field !py-2 text-sm"
                    >
                      <option value="">-- القسم --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      list="bulk-brands"
                      value={r.brand}
                      onChange={(e) => patchRow(r.rid, { brand: e.target.value })}
                      className="input-field !py-2 text-sm"
                      placeholder="البراند (اختياري)"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <textarea
                      rows={2}
                      value={r.description}
                      onChange={(e) => patchRow(r.rid, { description: e.target.value })}
                      className="input-field !py-2 text-sm"
                      placeholder="الوصف (اختياري)"
                    />
                  </div>

                  {/* delivery — كلا الخيارين ظاهران جنباً إلى جنب (لا حاجة للضغط لتبديلهما) */}
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => patchRow(r.rid, { delivery_type: 'instant' })}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${
                          r.delivery_type === 'instant'
                            ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                            : 'border-luxor-sand bg-white text-luxor-navy/55 hover:border-emerald-300'
                        }`}
                      >
                        <Zap size={13} /> متاح فوراً
                      </button>
                      <button
                        type="button"
                        onClick={() => patchRow(r.rid, { delivery_type: 'preorder' })}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-bold transition ${
                          r.delivery_type === 'preorder'
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-luxor-sand bg-white text-luxor-navy/55 hover:border-amber-300'
                        }`}
                      >
                        <CalendarClock size={13} /> حجز مسبق
                      </button>
                    </div>
                    {r.delivery_type === 'preorder' && (
                      <input
                        type="number"
                        min="1"
                        value={r.delivery_days}
                        onChange={(e) => patchRow(r.rid, { delivery_days: e.target.value === '' ? '' : parseInt(e.target.value) })}
                        className="input-field !py-2 !w-20 text-center text-sm"
                        placeholder="أيام"
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-luxor-navy cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={r.is_available}
                      onChange={(e) => patchRow(r.rid, { is_available: e.target.checked })}
                      className="w-4 h-4 accent-luxor-gold"
                    />
                    متاح للبيع
                  </label>

                  {/* الدفع المقدم (العربون) لكل منتج */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-luxor-navy/60 mb-1">
                      <HandCoins size={12} className="text-luxor-darkgold" /> الدفع المقدم (العربون)
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => patchRow(r.rid, { deposit_type: 'none', deposit_value: '' })}
                        className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
                          r.deposit_type === 'none' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                        }`}
                      >
                        بدون
                      </button>
                      <button
                        type="button"
                        onClick={() => patchRow(r.rid, { deposit_type: 'percent' })}
                        className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 border transition ${
                          r.deposit_type === 'percent' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                        }`}
                      >
                        <Percent size={11} /> نسبة %
                      </button>
                      <button
                        type="button"
                        onClick={() => patchRow(r.rid, { deposit_type: 'amount' })}
                        className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2.5 py-1 border transition ${
                          r.deposit_type === 'amount' ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                        }`}
                      >
                        <HandCoins size={11} /> مبلغ
                      </button>
                      {r.deposit_type !== 'none' && (
                        <>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={r.deposit_type === 'percent' ? 100 : undefined}
                            value={r.deposit_value}
                            onChange={(e) => patchRow(r.rid, { deposit_value: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                            className="input-field !py-1.5 !w-28 text-sm"
                            placeholder={r.deposit_type === 'percent' ? 'النسبة %' : 'المبلغ ج.م'}
                          />
                          {(() => {
                            const amt = depositAmount(Number(r.price), r.deposit_type, Number(r.deposit_value) || null);
                            return amt !== null ? (
                              <span className="text-[11px] bg-luxor-gold/15 border border-luxor-gold text-luxor-darkgold rounded-full px-2 py-0.5 font-bold">
                                {formatPrice(amt)} ج.م
                              </span>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </div>

                  {/* sizes chips */}
                  <div className="sm:col-span-2">
                    <div className="text-[11px] text-luxor-navy/60 mb-1">المقاسات</div>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_SIZES.map((s) => {
                        const active = r.sizes.some((x) => x.name === s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSize(r.rid, s)}
                            className={`text-[11px] rounded-full px-2 py-0.5 border transition ${
                              active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* colors chips */}
                  <div className="sm:col-span-2">
                    <div className="text-[11px] text-luxor-navy/60 mb-1">الألوان</div>
                    <div className="flex flex-wrap gap-1">
                      {PRESET_COLORS.map((p) => {
                        const active = r.colors.some((c) => c.name === p.name);
                        return (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => toggleColor(r.rid, p)}
                            className={`inline-flex items-center gap-1 text-[11px] rounded-full ps-1 pe-2 py-0.5 border transition ${
                              active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                            }`}
                          >
                            <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: p.hex }} />
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* fulfillment chips */}
                  <div className="sm:col-span-2">
                    <div className="text-[11px] text-luxor-navy/60 mb-1">خيارات الاستلام</div>
                    <div className="flex flex-wrap gap-1">
                      {FULFILLMENT_CHOICES.map(({ value, label, Icon }) => {
                        const active = r.fulfillment_options.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleFulfillment(r.rid, value)}
                            className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 border transition ${
                              active ? 'border-luxor-gold bg-luxor-gold/10 text-luxor-darkgold font-bold' : 'border-luxor-sand bg-white text-luxor-navy/60'
                            }`}
                          >
                            <Icon size={12} /> {label}
                          </button>
                        );
                      })}
                    </div>
                    {r.fulfillment_options.includes('address_pickup') && (
                      <input
                        value={r.pickup_address}
                        onChange={(e) => patchRow(r.rid, { pickup_address: e.target.value })}
                        className="input-field !py-2 text-sm mt-1.5"
                        placeholder="عنوان الاستلام *"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-luxor-gold/40 bg-luxor-gold/[0.03] hover:bg-luxor-gold/10 text-luxor-darkgold font-bold py-3 transition"
      >
        <Plus size={18} /> إضافة صف منتج جديد
      </button>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
      {savedCount !== null && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
          تم حفظ {savedCount} منتج بنجاح
        </div>
      )}

      <div className="sticky bottom-4 z-10">
        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 shadow-lg">
          <Save size={18} />
          {loading ? 'جاري الحفظ...' : 'نشر كل المنتجات'}
        </button>
      </div>
    </form>
  );
}
