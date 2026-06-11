'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Save, Upload, Store as StoreIcon, Crop } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import ImageEditor from '@/components/ImageEditor';
import type { Store } from '@/lib/types';

type EditingState = {
  kind: 'logo' | 'cover';
  src: string;
  isObjectUrl: boolean;
} | null;

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
  const [editing, setEditing] = useState<EditingState>(null);

  /** Open the real-time editor for a freshly picked file */
  const pickFile = (file: File, kind: 'logo' | 'cover') => {
    const url = URL.createObjectURL(file);
    setEditing({ kind, src: url, isObjectUrl: true });
  };

  /** Re-open the editor for an already-uploaded image */
  const editExisting = (kind: 'logo' | 'cover') => {
    const url = kind === 'logo' ? form.logo_url : form.cover_url;
    if (url) setEditing({ kind, src: url, isObjectUrl: false });
  };

  /** Upload the cropped blob and update the form URL */
  const handleEditorSave = async (blob: Blob) => {
    if (!editing) return;
    const kind = editing.kind;
    setUploading(kind);
    const path = `${userId}/${kind}-${Date.now()}.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from('store-assets')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (uploadErr) {
      setError(uploadErr.message);
    } else {
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      setForm((f) => ({ ...f, [kind === 'logo' ? 'logo_url' : 'cover_url']: data.publicUrl }));
    }
    if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
    setEditing(null);
    setUploading(null);
  };

  const closeEditor = () => {
    if (editing?.isObjectUrl) URL.revokeObjectURL(editing.src);
    setEditing(null);
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
      // New stores must be approved by admin → start as not approved
      res = await supabase.from('stores').insert({ ...payload, is_approved: false });
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
      {/* Real-time crop/reposition editor */}
      {editing && (
        <ImageEditor
          src={editing.src}
          aspect={editing.kind === 'cover' ? 16 / 6 : 1}
          title={editing.kind === 'cover' ? 'تعديل صورة الغلاف' : 'تعديل شعار المتجر'}
          outputWidth={editing.kind === 'cover' ? 1600 : 600}
          round={editing.kind === 'logo'}
          onCancel={closeEditor}
          onSave={handleEditorSave}
        />
      )}

      {/* Cover */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">صورة الغلاف</label>
        <div className="relative aspect-[16/6] rounded-xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand group">
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
              onChange={(e) => {
                if (e.target.files?.[0]) pickFile(e.target.files[0], 'cover');
                e.target.value = '';
              }}
            />
          </label>
          {form.cover_url && (
            <button
              type="button"
              onClick={() => editExisting('cover')}
              className="absolute bottom-2 end-2 inline-flex items-center gap-1.5 bg-luxor-obsidian/70 hover:bg-luxor-obsidian text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur transition"
            >
              <Crop size={13} />
              تعديل الموضع والحجم
            </button>
          )}
          {uploading === 'cover' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
              جاري الرفع...
            </div>
          )}
        </div>
        <p className="text-xs text-luxor-navy/50 mt-1.5">اضغط على الصورة لرفع غلاف جديد — سيفتح محرر مباشر للتكبير وتغيير الموضع</p>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">شعار المتجر</label>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand relative">
            {form.logo_url ? (
              <Image src={form.logo_url} alt="logo" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-navy/40">
                <StoreIcon size={28} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="btn-outline !py-2 !px-4 !text-sm cursor-pointer">
              <Upload size={16} />
              رفع شعار
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) pickFile(e.target.files[0], 'logo');
                  e.target.value = '';
                }}
              />
            </label>
            {form.logo_url && (
              <button
                type="button"
                onClick={() => editExisting('logo')}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-luxor-navy/70 hover:text-luxor-darkgold border border-luxor-sand hover:border-luxor-gold rounded-xl px-4 py-2 transition"
              >
                <Crop size={13} />
                تعديل الموضع والحجم
              </button>
            )}
          </div>
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
        <label htmlFor="is_active" className="text-sm text-luxor-navy">
          المتجر نشط <span className="text-luxor-navy/60 text-xs">(يظهر للعملاء فقط بعد موافقة الإدارة)</span>
        </label>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        <Save size={18} />
        {loading ? 'جاري الحفظ...' : initialStore ? 'حفظ التغييرات' : 'إنشاء المتجر'}
      </button>
    </form>
  );
}
