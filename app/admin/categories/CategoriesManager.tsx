'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Save, Trash2, Crop, Upload, X, LayoutGrid, Loader2, ImageIcon, Pencil,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { slugify } from '@/lib/utils';
import ImageEditor from '@/components/ImageEditor';
import CroppedImage from '@/components/CroppedImage';
import { blobExt, removeStorageUrls, uploadImage } from '@/lib/storage';
import type { Category, ImageCrop } from '@/lib/types';

type Draft = {
  id: number | null; // null = قسم جديد
  slug: string;
  name_ar: string;
  name_en: string;
  icon: string;
  image_url: string;
  image_meta: ImageCrop | null;
};

const emptyDraft = (): Draft => ({
  id: null,
  slug: '',
  name_ar: '',
  name_en: '',
  icon: '📦',
  image_url: '',
  image_meta: null,
});

export default function CategoriesManager({
  initialCategories,
  productCounts,
}: {
  initialCategories: Category[];
  productCounts: Record<number, number>;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // ImageEditor state
  const [imgEditor, setImgEditor] = useState<{
    src: string;
    isObjectUrl: boolean;
    sourceIsRemote: boolean;
    initialCrop: ImageCrop | null;
  } | null>(null);

  const openNew = () => {
    setError('');
    setEditing(emptyDraft());
  };

  const openEdit = (c: Category) => {
    setError('');
    setEditing({
      id: c.id,
      slug: c.slug,
      name_ar: c.name_ar,
      name_en: c.name_en,
      icon: c.icon ?? '📦',
      image_url: c.image_url ?? '',
      image_meta: (c.image_meta ?? null) as ImageCrop | null,
    });
  };

  const closeForm = () => {
    if (imgEditor?.isObjectUrl) URL.revokeObjectURL(imgEditor.src);
    setImgEditor(null);
    setEditing(null);
    setError('');
  };

  /* ─────────── الصورة: رفع + قص (نفس نظام بقية الصور) ─────────── */
  const pickFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setImgEditor({ src: url, isObjectUrl: true, sourceIsRemote: false, initialCrop: null });
  };

  const editExistingImage = () => {
    if (!editing?.image_url) return;
    setImgEditor({
      src: editing.image_url,
      isObjectUrl: false,
      sourceIsRemote: true,
      initialCrop: editing.image_meta,
    });
  };

  const handleEditorSaveMeta = async ({ crop, blob }: { crop: ImageCrop; blob: Blob | null }) => {
    if (!editing) return;
    setUploading(true);
    try {
      let publicUrl = '';
      if (blob) {
        publicUrl = await uploadImage('store-assets', blob, `category-${Date.now()}.${blobExt(blob)}`);
      }
      setEditing((d) => {
        if (!d) return d;
        const old = d.image_url;
        const newUrl = publicUrl || old;
        // إذا رُفع ملف جديد (صورة جديدة/تدوير) واستُبدل القديم → احذف القديم
        if (old && old !== newUrl) void removeStorageUrls([old]);
        return { ...d, image_url: newUrl, image_meta: crop };
      });
    } catch (e: any) {
      setError(e?.message || 'فشل رفع الصورة');
    }
    if (imgEditor?.isObjectUrl) URL.revokeObjectURL(imgEditor.src);
    setImgEditor(null);
    setUploading(false);
  };

  const removeImage = () => {
    setEditing((d) => {
      if (!d) return d;
      if (d.image_url) void removeStorageUrls([d.image_url]);
      return { ...d, image_url: '', image_meta: null };
    });
  };

  /* ─────────── حفظ القسم ─────────── */
  const save = async () => {
    if (!editing) return;
    setError('');
    const name_ar = editing.name_ar.trim();
    if (!name_ar) {
      setError('اسم القسم بالعربية مطلوب');
      return;
    }
    const slug = (editing.slug || slugify(editing.name_en || name_ar)).trim();
    if (!slug) {
      setError('رابط القسم (slug) مطلوب');
      return;
    }

    setSaving(true);
    const payload = {
      slug,
      name_ar,
      name_en: editing.name_en.trim() || name_ar,
      icon: editing.icon.trim() || '📦',
      image_url: editing.image_url || null,
      image_meta: editing.image_url ? editing.image_meta : null,
    };

    let res;
    if (editing.id != null) {
      res = await supabase.from('categories').update(payload).eq('id', editing.id);
    } else {
      res = await supabase.from('categories').insert(payload);
    }

    if (res.error) {
      const msg = /image_url|image_meta/.test(res.error.message)
        ? `${res.error.message} — يبدو أن تحديث قاعدة البيانات (0015) لم يُشغّل بعد في Supabase`
        : /duplicate|unique/.test(res.error.message)
        ? 'يوجد قسم آخر بنفس الرابط (slug) — اختر رابطاً مختلفاً'
        : res.error.message;
      setError(msg);
      setSaving(false);
      return;
    }

    setSaving(false);
    setEditing(null);
    router.refresh();
  };

  /* ─────────── حذف القسم ─────────── */
  const remove = async (c: Category) => {
    const count = productCounts[c.id] ?? 0;
    const warn =
      count > 0
        ? `هذا القسم مرتبط بـ ${count} منتج. سيتم فك ربط هذه المنتجات (تبقى بدون قسم). هل تريد المتابعة؟`
        : `حذف القسم «${c.name_ar}» نهائياً؟`;
    if (!confirm(warn)) return;

    setDeletingId(c.id);
    setError('');

    // فكّ ربط المنتجات أولاً حتى لا يفشل الحذف بسبب القيد المرجعي
    if (count > 0) {
      await supabase.from('products').update({ category_id: null }).eq('category_id', c.id);
    }

    const res = await supabase.from('categories').delete().eq('id', c.id);
    if (res.error) {
      setError(res.error.message);
      setDeletingId(null);
      return;
    }
    if (c.image_url) void removeStorageUrls([c.image_url]);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div>
      {/* ImageEditor (نفس محرّر الصور المستخدم في باقي الموقع) */}
      {imgEditor && (
        <ImageEditor
          src={imgEditor.src}
          aspect={4 / 5}
          title="تعديل صورة القسم"
          outputWidth={1000}
          metaMode
          sourceIsRemote={imgEditor.sourceIsRemote}
          initialCrop={imgEditor.initialCrop}
          onCancel={() => {
            if (imgEditor.isObjectUrl) URL.revokeObjectURL(imgEditor.src);
            setImgEditor(null);
          }}
          onSaveMeta={handleEditorSaveMeta}
        />
      )}

      {/* رأس الصفحة */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-luxor-gold/15">
            <LayoutGrid className="text-luxor-darkgold" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-luxor-navy">إدارة الأقسام</h2>
            <p className="text-sm text-luxor-navy/60">أضف، عدّل، أو احذف الأقسام وأضف لكل قسم صورة جذّابة</p>
          </div>
        </div>
        <button onClick={openNew} className="btn-primary !py-2 !px-4 !text-sm">
          <Plus size={16} /> قسم جديد
        </button>
      </div>

      {error && !editing && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* نموذج الإضافة/التعديل */}
      {editing && (
        <div className="mb-6 rounded-2xl border border-luxor-gold/30 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-luxor-navy">
              {editing.id != null ? 'تعديل القسم' : 'إضافة قسم جديد'}
            </h3>
            <button onClick={closeForm} className="rounded-full p-1.5 text-luxor-navy/50 hover:bg-luxor-sand/50">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[180px_1fr]">
            {/* صورة القسم */}
            <div>
              <label className="mb-2 block text-sm font-medium text-luxor-navy">صورة القسم</label>
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border-2 border-dashed border-luxor-sand bg-luxor-sandlight">
                {editing.image_url ? (
                  <CroppedImage src={editing.image_url} crop={editing.image_meta} alt="category" sizes="180px" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-luxor-navy/40">
                    <ImageIcon size={28} />
                    <span className="text-xs">بدون صورة</span>
                    <span className="text-3xl">{editing.icon}</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                    <Loader2 className="animate-spin" size={22} />
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <label className="btn-outline !py-2 !px-3 !text-xs cursor-pointer justify-center">
                  <Upload size={14} />
                  {editing.image_url ? 'تغيير الصورة' : 'رفع صورة'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) pickFile(e.target.files[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {editing.image_url && (
                  <>
                    <button
                      type="button"
                      onClick={editExistingImage}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-luxor-sand px-3 py-2 text-xs font-semibold text-luxor-navy/70 transition hover:border-luxor-gold hover:text-luxor-darkgold"
                    >
                      <Crop size={13} /> تعديل الموضع والحجم
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={13} /> إزالة الصورة
                    </button>
                  </>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-luxor-navy/50">
                تُحفظ الصورة الأصلية مرة واحدة ويُطبَّق القص/الزووم كبيانات (نفس نظام بقية الصور).
              </p>
            </div>

            {/* الحقول النصية */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-luxor-navy">الاسم بالعربية *</label>
                  <input
                    value={editing.name_ar}
                    onChange={(e) =>
                      setEditing((d) =>
                        d ? { ...d, name_ar: e.target.value, slug: d.id == null && !d.slug ? slugify(d.name_en || e.target.value) : d.slug } : d
                      )
                    }
                    className="input-field"
                    placeholder="مثال: تحف وهدايا"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-luxor-navy">الاسم بالإنجليزية</label>
                  <input
                    value={editing.name_en}
                    onChange={(e) =>
                      setEditing((d) =>
                        d ? { ...d, name_en: e.target.value, slug: d.id == null && !d.slug ? slugify(e.target.value) : d.slug } : d
                      )
                    }
                    className="input-field"
                    placeholder="Antiques & Gifts"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-luxor-navy">الأيقونة (إيموجي)</label>
                  <input
                    value={editing.icon}
                    onChange={(e) => setEditing((d) => (d ? { ...d, icon: e.target.value } : d))}
                    className="input-field text-center text-xl"
                    maxLength={4}
                    placeholder="📦"
                  />
                  <p className="mt-1 text-[11px] text-luxor-navy/50">تظهر عند عدم وجود صورة</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-luxor-navy">الرابط (slug)</label>
                  <input
                    value={editing.slug}
                    onChange={(e) => setEditing((d) => (d ? { ...d, slug: slugify(e.target.value) } : d))}
                    className="input-field"
                    placeholder="antiques"
                    dir="ltr"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button onClick={save} disabled={saving || uploading} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'جاري الحفظ…' : 'حفظ القسم'}
                </button>
                <button onClick={closeForm} className="btn-outline !py-2.5 !px-5 !text-sm">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* قائمة الأقسام */}
      {initialCategories.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-luxor-gold/30 bg-white p-10 text-center text-luxor-navy/60">
          لا توجد أقسام بعد — أضف أول قسم.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialCategories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl border border-luxor-gold/20 bg-white p-3 shadow-sm"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-luxor-sandlight">
                {c.image_url ? (
                  <CroppedImage src={c.image_url} crop={c.image_meta} alt={c.name_ar} sizes="64px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl">{c.icon ?? '📦'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-bold text-luxor-navy">{c.name_ar}</h4>
                <p className="truncate text-xs text-luxor-navy/55">{c.name_en}</p>
                <p className="mt-0.5 text-[11px] text-luxor-navy/45">
                  /{c.slug} • {productCounts[c.id] ?? 0} منتج
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  onClick={() => openEdit(c)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-luxor-sand px-2.5 py-1.5 text-xs font-semibold text-luxor-navy/70 transition hover:border-luxor-gold hover:text-luxor-darkgold"
                >
                  <Pencil size={13} /> تعديل
                </button>
                <button
                  onClick={() => remove(c)}
                  disabled={deletingId === c.id}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
