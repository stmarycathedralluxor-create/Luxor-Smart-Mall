'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, X, Save, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Category, Product } from '@/lib/types';

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

  const uploadImages = async (files: FileList) => {
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) {
        setError(error.message);
        continue;
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...uploaded].slice(0, 8) }));
    setUploading(false);
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
                className="absolute top-1 end-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={12} />
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
                onChange={(e) => e.target.files && uploadImages(e.target.files)}
              />
            </label>
          )}
        </div>
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
