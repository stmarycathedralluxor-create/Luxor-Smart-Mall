'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Upload, Store as StoreIcon, Crop } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import ImageEditor from '@/components/ImageEditor';
import CroppedImage from '@/components/CroppedImage';
import PhoneInput from '@/components/PhoneInput';
import { blobExt, checkQuotaBeforeUpload, removeStorageUrls, uploadImage } from '@/lib/storage';
import type { ImageCrop, Store } from '@/lib/types';

type EditingState = {
  kind: 'logo' | 'cover';
  src: string;
  isObjectUrl: boolean;
  /** المصدر مخزَّن بالفعل على الخادم — إعادة القص تحدّث الـ JSON فقط بدون رفع */
  sourceIsRemote: boolean;
  /** بيانات القص السابقة لاستعادة الوضع في المحرر */
  initialCrop: ImageCrop | null;
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
    logo_meta: (initialStore?.logo_meta ?? null) as ImageCrop | null,
    cover_meta: (initialStore?.cover_meta ?? null) as ImageCrop | null,
    is_active: initialStore?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const [editing, setEditing] = useState<EditingState>(null);
  // Original saved URLs — replaced files get physically deleted after save
  const persistedLogo = initialStore?.logo_url ?? '';
  const persistedCover = initialStore?.cover_url ?? '';

  /** Open the real-time editor for a freshly picked file */
  const pickFile = (file: File, kind: 'logo' | 'cover') => {
    const url = URL.createObjectURL(file);
    setEditing({ kind, src: url, isObjectUrl: true, sourceIsRemote: false, initialCrop: null });
  };

  /**
   * Re-open the editor for an already-uploaded image — المصدر هو الصورة
   * الأصلية الوحيدة المخزَّنة. إعادة القص/الزووم تحدّث بيانات JSON فقط
   * — بدون رفع أي ملف جديد (نفس نظام صور المنتجات).
   */
  const editExisting = (kind: 'logo' | 'cover') => {
    const url = kind === 'logo' ? form.logo_url : form.cover_url;
    if (!url) return;
    setEditing({
      kind,
      src: url,
      isObjectUrl: false,
      sourceIsRemote: true,
      initialCrop: kind === 'logo' ? form.logo_meta : form.cover_meta,
    });
  };

  /**
   * النظام الجديد — صورة أصلية واحدة + بيانات قص في قاعدة البيانات:
   *  - صورة جديدة ← رفع الأصل مرة واحدة + حفظ القص كـ JSON
   *  - إعادة قص صورة موجودة ← تحديث الـ JSON فقط (blob = null، صفر بايت رفع!)
   *  - تدوير صورة موجودة ← رفع نسخة مُدارة تحل محل القديمة (ملف واحد أيضاً)
   */
  const handleEditorSaveMeta = async ({ crop, blob }: { crop: ImageCrop; blob: Blob | null }) => {
    if (!editing) return;
    const kind = editing.kind;
    setUploading(kind);
    try {
      let publicUrl = '';
      if (blob) {
        // Pre-check the storage quota before uploading
        const quotaError = await checkQuotaBeforeUpload(supabase, blob.size);
        if (quotaError) {
          setError(quotaError);
          if (editing.isObjectUrl) URL.revokeObjectURL(editing.src);
          setEditing(null);
          setUploading(null);
          return;
        }
        // Upload to Cloudflare R2 via our server API
        publicUrl = await uploadImage('store-assets', blob, `${kind}-${Date.now()}.${blobExt(blob)}`);
      }
      setForm((f) => {
        const urlKey = kind === 'logo' ? 'logo_url' : 'cover_url';
        const metaKey = kind === 'logo' ? 'logo_meta' : 'cover_meta';
        const old = f[urlKey];
        // إذا رُفع ملف جديد (صورة جديدة أو تدوير) ← استبدل الرابط؛
        // وإلا احتفظ بالأصل وحدّث بيانات القص فقط
        const newUrl = publicUrl || old;
        // تحرير المساحة: الملفات التي رُفعت في هذه الجلسة ولم تعد مستخدمة
        const persisted = kind === 'logo' ? persistedLogo : persistedCover;
        if (old && old !== newUrl && old !== persisted) {
          void removeStorageUrls([old]);
        }
        return { ...f, [urlKey]: newUrl, [metaKey]: crop };
      });
    } catch (err: any) {
      setError(err?.message || 'فشل رفع الصورة');
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
      logo_meta: form.logo_url ? form.logo_meta : null,
      cover_meta: form.cover_url ? form.cover_meta : null,
      is_active: form.is_active,
    };

    let res;
    if (initialStore) {
      res = await supabase.from('stores').update(payload).eq('id', initialStore.id);
    } else {
      // New stores must be approved by admin → start as not approved
      res = await supabase.from('stores').insert({ ...payload, is_approved: false });
      // bump role to seller — but NEVER downgrade an admin account
      // (this used to blindly set role='both' and reset admins to regular users)
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (prof && prof.role !== 'admin' && prof.role !== 'both') {
        await supabase.from('profiles').update({ role: 'both' }).eq('id', userId);
      }
    }

    if (res.error) {
      // Helpful hint if the 0012 migration hasn't been run yet
      const msg = /logo_meta|cover_meta/.test(res.error.message)
        ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0012) لم يتم تشغيله بعد في Supabase`
        : res.error.message;
      setError(msg);
      setLoading(false);
      return;
    }

    // Storage cleanup: previously saved logo/cover that got replaced or
    // removed are now orphaned → physically delete them to free space
    const orphaned: string[] = [];
    if (persistedLogo && persistedLogo !== form.logo_url) orphaned.push(persistedLogo);
    if (persistedCover && persistedCover !== form.cover_url) orphaned.push(persistedCover);
    if (orphaned.length) {
      await removeStorageUrls(orphaned);
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
          metaMode
          sourceIsRemote={editing.sourceIsRemote}
          initialCrop={editing.initialCrop}
          onCancel={closeEditor}
          onSaveMeta={handleEditorSaveMeta}
        />
      )}

      {/* Cover */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">صورة الغلاف</label>
        <div className="relative aspect-[16/6] rounded-xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand group">
          {form.cover_url ? (
            <CroppedImage src={form.cover_url} crop={form.cover_meta} alt="cover" sizes="600px" />
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
        <p className="text-xs text-luxor-navy/50 mt-1.5">اضغط على الصورة لرفع غلاف جديد — تُحفظ الصورة الأصلية مرة واحدة فقط ويُطبّق القص/الزووم كبيانات بدون استهلاك مساحة إضافية</p>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-2">شعار المتجر</label>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-luxor-sandlight border-2 border-dashed border-luxor-sand relative">
            {form.logo_url ? (
              <CroppedImage src={form.logo_url} crop={form.logo_meta} alt="logo" sizes="96px" />
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
        <PhoneInput
          required
          value={form.whatsapp}
          onChange={(full) => setForm({ ...form, whatsapp: full })}
        />
        <p className="text-xs text-luxor-navy/60 mt-1">ابدأ بـ 0 بعد المقدّمة الثابتة +2 — سيتواصل العملاء معك مباشرة عبر هذا الرقم</p>
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
