'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, MapPin, UserPlus, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';

export default function SignupPage() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    city: 'الأقصر',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const siteUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL;

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: form.fullName,
          phone: form.phone,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Update profile with extra fields (will succeed once email is confirmed; we also try now)
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ full_name: form.fullName, phone: form.phone, city: form.city })
        .eq('id', data.user.id);
    }

    // If email confirmation disabled, session is set immediately
    if (data.session) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card p-8 text-center animate-fade-in">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-luxor-navy mb-2">{t.common.success}</h2>
          <p className="text-luxor-navy/70 mb-6">{t.auth.checkEmail}</p>
          <Link href="/login" className="btn-primary inline-flex">
            {t.auth.submitLogin}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor">
              <UserPlus className="text-luxor-navy" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-luxor-navy">{t.auth.signupTitle}</h1>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.fullName}</label>
              <div className="relative">
                <User className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="input-field ps-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field ps-10"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.phone}</label>
              <div className="relative">
                <Phone className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input-field ps-10"
                  placeholder="+201xxxxxxxxx"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.city}</label>
              <div className="relative">
                <MapPin className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="input-field ps-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.password}</label>
              <div className="relative">
                <Lock className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field ps-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? t.common.loading : t.auth.submitSignup}
            </button>
          </form>

          <div className="text-center text-sm mt-6 text-luxor-navy/70">
            {t.auth.hasAccount}{' '}
            <Link href="/login" className="text-luxor-gold font-semibold hover:underline">
              {t.auth.loginHere}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
