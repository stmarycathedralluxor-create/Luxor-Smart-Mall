'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Save, Upload, Store as StoreIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import type { Store } from '@/lib/types';

export default function StoreForm({
  initialStore,
  userId,
  defaultPhone,
}: {
  initialStore: Store | null;
  userId: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    name: initialStore?.name ?? '',
    slug: initialStore?.slug ?? '',
    description: initialStore?.description ?? '',
    whatsapp: initialStore?.whatsapp ?? defaultPhone ?? '',
    city: initialStore?.city ?? 'الأقصر',
    logo_url: initialStore?.logo_url ?? '',
    cover_url: initialStore?.cover_url ?? '',
    is_active: initialStore?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);

  const handleUpload = async (file: File, kind: 'logo' | 'cover') => {
    setUploading(kind);
    const ext = file.name.split('.').pop();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('store-assets')
      .upload(path, file, { upsert: true });
    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(null);
      return;
    }
    const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
    setForm((f) => ({ ...f, [kind === 'logo' ? 'logo_url' : 'cover_url']: data.publicUrl }));
    setUploading(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const slug = form.slug || slugify(form.name);

    const payload = {
      owner_id: userId,
      name: form.name,
      slug,
      description: form.description || null,
      whatsapp: form.whatsapp,
      city: form.city || null,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      is_active: form.is_active,
    };

    let res;
    if (initialStore) {
      res = await supabase.from('stores').update(payload).eq('id', initialStore.id);
    } else {
      res = await supabase.from('stores').insert(payload);
      // bump role to seller
      await supabase.from('profiles').update({ role: 'both' }).eq('id', userId);
    }

    if (res.error) {
      setError(res.error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      {/* Cover */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">صورة الغلاف</label>
        <div className="relative aspect-[16/6] rounded-xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand">
          {form.cover_url ? (
            <Image src={form.cover_url} alt="cover" fill className="object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-luxor-navy/40">
              <Upload size={32} />
            </div>
          )}
          <label className="absolute inset-0 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'cover')}
            />
          </label>
          {uploading === 'cover' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
              جاري الرفع...
            </div>
          )}
        </div>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">شعار المتجر</label>
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand relative">
            {form.logo_url ? (
              <Image src={form.logo_url} alt="logo" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-navy/40">
                <StoreIcon size={28} />
              </div>
            )}
          </div>
          <label className="btn-outline !py-2 !px-4 !text-sm cursor-pointer">
            <Upload size={16} />
            رفع شعار
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')}
            />
          </label>
          {uploading === 'logo' && <span className="text-sm text-luxor-navy/60">جاري الرفع...</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-luxor-navy mb-1">اسم المتجر *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
            className="input-field"
            placeholder="مثال: تحف الأقصر"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-luxor-navy mb-1">رابط المتجر *</label>
          <div className="flex items-center">
            <span className="px-3 py-3 bg-luxor-sandlight border border-luxor-sand rounded-s-xl text-sm text-luxor-navy/60">
              /stores/
            </span>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              className="input-field rounded-s-none"
              placeholder="luxor-antiques"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">رقم الواتساب *</label>
        <input
          type="tel"
          required
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          className="input-field"
          placeholder="+201xxxxxxxxx"
        />
        <p className="text-xs text-luxor-navy/60 mt-1">سيتواصل العملاء معك مباشرة عبر هذا الرقم</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">المدينة</label>
        <input
          type="text"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">وصف المتجر</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field"
          placeholder="اكتب وصفاً مختصراً عن متجرك..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="w-4 h-4 accent-luxor-gold"
        />
        <label htmlFor="is_active" className="text-sm text-luxor-navy">المتجر نشط ومرئي للجميع</label>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        <Save size={18} />
        {loading ? 'جاري الحفظ...' : initialStore ? 'حفظ التغييرات' : 'إنشاء المتجر'}
      </button>
    </form>
  );
}
