'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';

export default function LoginPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextUrl = searchParams.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Initial error may come from /auth/callback?error=...
  const initialError = (() => {
    const e = searchParams.get('error');
    if (!e) return '';
    if (e === 'auth_callback_failed') return 'فشل تسجيل الدخول، حاول مرة أخرى.';
    if (e === 'missing_code') return 'انقطعت عملية تسجيل الدخول. حاول مرة أخرى.';
    return decodeURIComponent(e);
  })();
  const [error, setError] = useState(initialError);

  const siteOrigin = () =>
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || '';

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  };

  const friendlyAuthError = (msg: string) => {
    const m = (msg || '').toLowerCase();
    if (m.includes('invalid login credentials'))
      return 'بيانات الدخول غير صحيحة. تأكد من البريد وكلمة المرور.';
    if (m.includes('email not confirmed'))
      return 'لم يتم تأكيد البريد بعد. افتح بريدك واضغط على رابط التفعيل.';
    if (m.includes('rate limit') || m.includes('too many'))
      return 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.';
    if (m.includes('network')) return 'تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.';
    return msg || 'حدث خطأ غير متوقع، حاول مرة أخرى.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(friendlyAuthError(error.message));
        setLoading(false);
        return;
      }
      // Make sure the new session is reflected before navigating
      await supabase.auth.getUser();
      router.refresh();
      router.push(nextUrl);
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
      setLoading(false);
    }
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

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full mb-5 flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 border-luxor-sand bg-white hover:bg-luxor-sandlight hover:border-luxor-gold transition font-semibold text-luxor-navy disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A10.99 10.99 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
            </svg>
            {googleLoading ? 'جاري التحويل...' : 'الدخول باستخدام Google'}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-luxor-sand"/></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-luxor-navy/60">أو</span></div>
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
