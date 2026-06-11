'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Save, Crop } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ImageEditor from '@/components/ImageEditor';
import type { Category, Product } from '@/lib/types';

type EditingState = {
  src: string;
  isObjectUrl: boolean;
  /** index to replace, or null to append. Remaining queue of files to edit after this one */
  replaceIndex: number | null;
  queue: File[];
} | null;

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
    category_id: initialProduct?.category_id ?? null as number | null,
    images: initialProduct?.images ?? [] as string[],
    is_available: initialProduct?.is_available ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditingState>(null);

  /** New files picked → open the editor for the first one, queue the rest */
  const pickFiles = (files: FileList) => {
    const list = Array.from(files).slice(0, 8 - form.images.length);
    if (!list.length) return;
    const [first, ...rest] = list;
    setEditing({ src: URL.createObjectURL(first), isObjectUrl: true, replaceIndex: null, queue: rest });
  };

  /** Re-edit an already uploaded image */
  const editExisting = (idx: number) => {
    setEditing({ src: form.images[idx], isObjectUrl: false, replaceIndex: idx, queue: [] });
  };

  const advanceQueue = (queue: File[]) => {
    if (queue.length) {
      const [next, ...rest] = queue;
      setEditing({ src: URL.createObjectURL(next), isObjectUrl: true, replaceIndex: null, queue: rest });
    } else {
      setEditing(null);
    }
  };

  const handleEditorSave = async (blob: Blob) => {
    if (!editing) return;
    setUploading(true);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(path, blob, { contentType: 'image/jpeg' });
    if (upErr) {
      setError(upErr.message);
    } else {
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      const replaceIndex = editing.replaceIndex;
      setForm((f) => {
        if (replaceIndex !== null) {
          const images = [...f.images];
          images[replaceIndex] = data.publicUrl;
          return { ...f, images };
        }
        return { ...f, images: [...f.images, data.publicUrl].slice(0, 8) };
      });
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
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      store_id: storeId,
      title: form.title,
      description: form.description || null,
      price: Number(form.price),
      category_id: form.category_id,
      images: form.images,
      is_available: form.is_available,
    };

    let res;
    if (initialProduct) {
      res = await supabase.from('products').update(payload).eq('id', initialProduct.id);
    } else {
      res = await supabase.from('products').insert(payload);
    }

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
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
        <p className="text-xs text-luxor-navy/50 mt-1.5">عند رفع صورة سيفتح محرر مباشر للتكبير وتغيير الموضع قبل الحفظ — ويمكنك تعديل أي صورة لاحقاً</p>
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
