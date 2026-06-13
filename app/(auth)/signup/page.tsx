'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, MapPin, UserPlus, CheckCircle2, Store as StoreIcon, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';
import PhoneInput, { localDigits } from '@/components/PhoneInput';

export default function SignupPage() {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // ?as=seller comes from "افتح متجرك مجاناً" CTA and from product card price button
  const defaultMode = searchParams.get('as') === 'seller' ? 'seller' : 'buyer';
  const nextUrl = searchParams.get('next') || '/dashboard';

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    city: 'الأقصر',
    mode: defaultMode as 'buyer' | 'seller',
  });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<null | 'email' | 'seller-pending'>(null);

  const siteOrigin = () =>
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || '';

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError('');
    // Pass the seller intent through the next URL so the callback can flip wants_to_sell.
    const sellerFlag = form.mode === 'seller' ? '1' : '0';
    const next = `${nextUrl}?seller=${sellerFlag}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
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
    if (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))
      return 'هذا البريد مسجل مسبقاً. سجّل الدخول بدلاً من ذلك.';
    if (m.includes('password') && m.includes('short'))
      return 'كلمة المرور قصيرة جداً (الحد الأدنى 6 أحرف).';
    if (m.includes('invalid email') || m.includes('valid email'))
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    if (m.includes('rate limit') || m.includes('too many'))
      return 'محاولات كثيرة. انتظر دقيقة ثم حاول مجدداً.';
    if (m.includes('network')) return 'تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة.';
    return msg || 'حدث خطأ غير متوقع، حاول مرة أخرى.';
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Basic client-side validation to avoid noisy server errors.
      if (form.phone && localDigits(form.phone).length < 7) {
        setError('رقم الهاتف غير صحيح. ابدأ بـ 0 بعد المقدّمة +2');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${siteOrigin()}/auth/callback`,
          data: {
            full_name: form.fullName,
            phone: form.phone,
            wants_to_sell: form.mode === 'seller',
          },
        },
      });

      if (error) {
        setError(friendlyAuthError(error.message));
        setLoading(false);
        return;
      }

      // Update profile with extra fields (best-effort; works once session is set).
      // The DB trigger handle_new_user() already created a base row, so we
      // update it in place. We retry once if the very first call races the
      // trigger.
      if (data.user && data.session) {
        const payload = {
          full_name: form.fullName,
          phone: form.phone,
          city: form.city,
          wants_to_sell: form.mode === 'seller',
        };
        const first = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', data.user.id);
        if (first.error) {
          // tiny backoff then retry once
          await new Promise((r) => setTimeout(r, 400));
          await supabase.from('profiles').update(payload).eq('id', data.user.id);
        }
      }

      if (data.session) {
        // session already established → go to dashboard / pending page
        await supabase.auth.getUser();
        if (form.mode === 'seller') {
          setDone('seller-pending');
        } else {
          router.refresh();
          router.push(nextUrl);
        }
      } else {
        setDone('email');
      }
    } catch (err: any) {
      setError(friendlyAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  if (done === 'email') {
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

  if (done === 'seller-pending') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card p-8 text-center animate-fade-in">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-luxor-navy mb-2">تم استلام طلبك</h2>
          <p className="text-luxor-navy/70 mb-6">
            تم إنشاء حسابك بنجاح. طلب تفعيل حساب البائع قيد المراجعة من قِبَل الإدارة وسيتم إشعارك فور الموافقة.
          </p>
          <Link href="/dashboard" className="btn-primary inline-flex">
            الذهاب للوحة التحكم
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

          {/* Account-type chooser */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => setForm({ ...form, mode: 'buyer' })}
              className={`p-4 rounded-xl border-2 text-center transition ${
                form.mode === 'buyer'
                  ? 'border-luxor-gold bg-luxor-gold/10'
                  : 'border-luxor-sand hover:border-luxor-gold/50'
              }`}
            >
              <ShoppingBag className="mx-auto mb-1 text-luxor-navy" size={22} />
              <div className="text-sm font-bold text-luxor-navy">مشتري</div>
              <div className="text-[11px] text-luxor-navy/60">تصفّح وشراء</div>
            </button>

            <button
              type="button"
              onClick={() => setForm({ ...form, mode: 'seller' })}
              className={`p-4 rounded-xl border-2 text-center transition ${
                form.mode === 'seller'
                  ? 'border-luxor-gold bg-luxor-gold/10'
                  : 'border-luxor-sand hover:border-luxor-gold/50'
              }`}
            >
              <StoreIcon className="mx-auto mb-1 text-luxor-gold" size={22} />
              <div className="text-sm font-bold text-luxor-navy">بائع</div>
              <div className="text-[11px] text-luxor-navy/60">يحتاج موافقة الإدارة</div>
            </button>
          </div>

          {form.mode === 'seller' && (
            <div className="mb-5 bg-luxor-gold/10 border border-luxor-gold/40 text-luxor-navy text-xs rounded-lg p-3">
              📝 حساب البائع يحتاج موافقة من إدارة المنصة قبل تفعيله وفتح المتجر.
            </div>
          )}

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
            {googleLoading ? 'جاري التحويل...' : 'المتابعة باستخدام Google'}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-luxor-sand"/></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-luxor-navy/60">أو سجّل بالبريد</span></div>
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
              <PhoneInput
                required
                withIcon
                value={form.phone}
                onChange={(full) => setForm({ ...form, phone: full })}
              />
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
