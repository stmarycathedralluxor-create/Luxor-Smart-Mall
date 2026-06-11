'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Save, Camera, Crop, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ImageEditor from '@/components/ImageEditor';
import { blobExt, checkQuotaBeforeUpload } from '@/lib/storage';
import type { Profile } from '@/lib/types';

type EditingState = { src: string; isObjectUrl: boolean } | null;

export default function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? 'الأقصر',
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<EditingState>(null);

  const pickFile = (file: File) => {
    setEditing({ src: URL.createObjectURL(file), isObjectUrl: true });
  };

  const handleEditorSave = async (blob: Blob) => {
    if (!profile) return;
    setUploading(true);
    // Pre-check the storage quota before uploading
    const quotaError = await checkQuotaBeforeUpload(supabase, blob.size);
    if (quotaError) {
      setError(quotaError);
      if (editing?.isObjectUrl) URL.revokeObjectURL(editing.src);
      setEditing(null);
      setUploading(false);
      return;
    }
    const path = `${profile.id}/avatar-${Date.now()}.${blobExt(blob)}`;
    const { error: upErr } = await supabase.storage
      .from('store-assets')
      .upload(path, blob, { upsert: true, contentType: blob.type });
    if (upErr) {
      setError(upErr.message);
    } else {
      const { data } = supabase.storage.from('store-assets').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      // save immediately so the change is live right away
      await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', profile.id);
      setMsg('تم تحديث الصورة الشخصية');
      router.refresh();
    }
    if (editing?.isObjectUrl) URL.revokeObjectURL(editing.src);
    setEditing(null);
    setUploading(false);
  };

  const closeEditor = () => {
    if (editing?.isObjectUrl) URL.revokeObjectURL(editing.src);
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ ...form, avatar_url: avatarUrl || null })
      .eq('id', profile!.id);
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMsg('تم الحفظ بنجاح');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-2xl">
      {editing && (
        <ImageEditor
          src={editing.src}
          aspect={1}
          title="تعديل الصورة الشخصية"
          outputWidth={400}
          round
          onCancel={closeEditor}
          onSave={handleEditorSave}
        />
      )}

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-luxor-sandlight border-2 border-luxor-gold/40 relative">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="avatar" fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-luxor-navy/30">
                <User size={40} />
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px]">
                جاري الرفع...
              </div>
            )}
          </div>
          <label className="absolute -bottom-1 -end-1 bg-luxor-gold hover:bg-luxor-darkgold text-luxor-obsidian rounded-full p-2 cursor-pointer shadow-lg ring-2 ring-white transition">
            <Camera size={14} />
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
        </div>
        <div>
          <div className="font-bold text-luxor-navy">الصورة الشخصية</div>
          <p className="text-xs text-luxor-navy/60 mt-0.5">ارفع صورة وعدّل موضعها وحجمها مباشرة</p>
          {avatarUrl && (
            <button
              type="button"
              onClick={() => setEditing({ src: avatarUrl, isObjectUrl: false })}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-luxor-navy/70 hover:text-luxor-darkgold border border-luxor-sand hover:border-luxor-gold rounded-xl px-3 py-1.5 transition"
            >
              <Crop size={12} />
              تعديل الموضع والحجم
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">البريد الإلكتروني</label>
        <input type="email" value={email} disabled className="input-field bg-luxor-sandlight" />
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">الاسم الكامل</label>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-luxor-navy mb-1">رقم الهاتف</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="input-field"
        />
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">{msg}</div>}

      <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
        <Save size={18} />
        {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
      </button>
    </form>
  );
}
