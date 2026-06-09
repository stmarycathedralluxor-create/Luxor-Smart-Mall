'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor">
              <LogIn className="text-luxor-navy" size={28} />
            </div>
            <h1 className="text-2xl font-bold text-luxor-navy">{t.auth.loginTitle}</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-luxor-navy mb-1">{t.auth.email}</label>
              <div className="relative">
                <Mail className="absolute top-3.5 start-3 text-luxor-navy/40" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field ps-10"
                  placeholder="you@example.com"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading ? t.common.loading : t.auth.submitLogin}
            </button>
          </form>

          <div className="text-center text-sm mt-6 text-luxor-navy/70">
            {t.auth.noAccount}{' '}
            <Link href="/signup" className="text-luxor-gold font-semibold hover:underline">
              {t.auth.createAccount}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
