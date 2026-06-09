'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, Store, LogIn, UserPlus, LogOut, LayoutDashboard, Search } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-luxor-sand/60 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor group-hover:scale-105 transition">
              <span className="text-luxor-navy font-bold text-lg">L</span>
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-luxor-navy">{t.siteName}</span>
              <span className="text-[10px] text-luxor-navy/60">Luxor Smart Mall</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">
              {t.nav.home}
            </Link>
            <Link href="/stores" className="px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">
              {t.nav.stores}
            </Link>
            <Link href="/categories" className="px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">
              {t.nav.categories}
            </Link>
            <Link href="/search" className="p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy">
              <Search size={20} />
            </Link>
          </div>

          {/* Auth + Lang */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-lg border border-luxor-sand hover:bg-luxor-sand/40 text-xs font-bold text-luxor-navy"
              aria-label="Toggle language"
            >
              {locale === 'ar' ? 'EN' : 'ع'}
            </button>

            {user ? (
              <>
                <Link href="/dashboard" className="btn-outline !py-2 !px-4 !text-sm">
                  <LayoutDashboard size={16} />
                  {t.nav.dashboard}
                </Link>
                <button onClick={logout} className="p-2 rounded-lg hover:bg-red-50 text-red-600" aria-label="logout">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-luxor-navy font-medium hover:bg-luxor-sand/40 rounded-lg flex items-center gap-1.5">
                  <LogIn size={16} /> {t.nav.login}
                </Link>
                <Link href="/signup" className="btn-primary !py-2 !px-4 !text-sm">
                  <UserPlus size={16} /> {t.nav.signup}
                </Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy"
            aria-label="menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-3 border-t border-luxor-sand/60 space-y-1 animate-fade-in">
            <Link href="/" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">{t.nav.home}</Link>
            <Link href="/stores" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">{t.nav.stores}</Link>
            <Link href="/categories" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">{t.nav.categories}</Link>
            <Link href="/search" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">{t.common.search}</Link>
            <div className="border-t border-luxor-sand/60 my-2" />
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">
                  {t.nav.dashboard}
                </Link>
                <button onClick={() => { logout(); setOpen(false); }} className="block w-full text-start px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium">
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy font-medium">{t.nav.login}</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg bg-luxor-gold text-luxor-navy font-semibold mx-2 text-center">{t.nav.signup}</Link>
              </>
            )}
            <button
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="block px-4 py-2 text-xs font-bold text-luxor-navy/70"
            >
              {locale === 'ar' ? '🌐 English' : '🌐 العربية'}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
