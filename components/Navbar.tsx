'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, Search } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import NavbarSearch from './NavbarSearch';

export default function Navbar() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-luxor-gold/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-luxor ring-1 ring-luxor-gold/40 group-hover:scale-105 transition">
              <Image
                src="/logo.png"
                alt="Luxor Smart Mall logo"
                fill
                sizes="44px"
                className="object-cover"
                priority
              />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="font-bold text-luxor-obsidian">{t.siteName}</span>
              <span className="text-[10px] text-luxor-darkgold tracking-wider">LUXOR SMART MALL</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium transition">
              {t.nav.home}
            </Link>
            <Link href="/categories" className="px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium transition">
              {t.nav.categories}
            </Link>
            <Link href="/stores" className="px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium transition">
              {t.nav.stores}
            </Link>
            <Link href="/search" className="px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium transition">
              {locale === 'ar' ? 'المنتجات' : 'Products'}
            </Link>
            <Link href="/catalog" className="px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium transition">
              {t.nav.catalog}
            </Link>
          </div>

          {/* Desktop live search (center) */}
          <div className="hidden lg:flex flex-1 justify-center px-4">
            <NavbarSearch variant="desktop" />
          </div>

          {/* Auth + Lang */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-lg border border-luxor-gold/50 hover:bg-luxor-gold/10 text-xs font-bold text-luxor-obsidian transition"
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
                <Link href="/login" className="px-4 py-2 text-luxor-obsidian font-medium hover:bg-luxor-gold/10 rounded-lg flex items-center gap-1.5 transition">
                  <LogIn size={16} /> {t.nav.login}
                </Link>
                <Link href="/signup" className="btn-primary !py-2 !px-4 !text-sm">
                  <UserPlus size={16} /> {t.nav.signup}
                </Link>
              </>
            )}
          </div>

          {/* Mobile: search toggle (always visible) + menu toggle */}
          <div className="md:hidden flex items-center gap-1.5">
            <button
              onClick={() => {
                setSearchOpen((s) => !s);
                setOpen(false);
              }}
              aria-label={locale === 'ar' ? 'بحث' : 'Search'}
              aria-expanded={searchOpen}
              className={`inline-flex items-center justify-center h-10 w-10 rounded-full border transition ${
                searchOpen
                  ? 'border-luxor-gold bg-luxor-gold/20 text-luxor-darkgold'
                  : 'border-luxor-gold/50 bg-luxor-gold/10 text-luxor-darkgold hover:bg-luxor-gold/20'
              }`}
            >
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            <button
              onClick={() => {
                setOpen(!open);
                setSearchOpen(false);
              }}
              className="p-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian transition"
              aria-label="menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile live search bar */}
        {searchOpen && (
          <div className="md:hidden pb-3 animate-fade-in">
            <NavbarSearch variant="mobile" onNavigate={() => setSearchOpen(false)} />
          </div>
        )}

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-3 border-t border-luxor-gold/30 space-y-1 animate-fade-in">
            <Link href="/" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{t.nav.home}</Link>
            <Link href="/categories" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{t.nav.categories}</Link>
            <Link href="/stores" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{t.nav.stores}</Link>
            <Link href="/search" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{locale === 'ar' ? 'المنتجات' : 'Products'}</Link>
            <Link href="/catalog" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{t.nav.catalog}</Link>
            <div className="border-t border-luxor-gold/30 my-2" />
            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">
                  {t.nav.dashboard}
                </Link>
                <button onClick={() => { logout(); setOpen(false); }} className="block w-full text-start px-4 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium">
                  {t.nav.logout}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg hover:bg-luxor-gold/10 text-luxor-obsidian font-medium">{t.nav.login}</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="block px-4 py-2 rounded-lg bg-gold-gradient text-luxor-obsidian font-semibold mx-2 text-center">{t.nav.signup}</Link>
              </>
            )}
            <button
              onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}
              className="block px-4 py-2 text-xs font-bold text-luxor-darkgold"
            >
              {locale === 'ar' ? '🌐 English' : '🌐 العربية'}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
