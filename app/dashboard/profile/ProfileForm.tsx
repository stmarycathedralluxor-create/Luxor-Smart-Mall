'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

export default function ProfileForm({ profile, email }: { profile: Profile | null; email: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    city: profile?.city ?? 'الأقصر',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');
    const { error } = await supabase.from('profiles').update(form).eq('id', profile!.id);
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
