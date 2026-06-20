'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from './LocaleProvider';

export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-luxor-obsidian text-white mt-16 overflow-hidden">
      {/* Subtle gold pattern background */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(212,175,55,0.5) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, rgba(232,199,101,0.4) 0%, transparent 40%)`,
        }}
      />

      {/* Top gold accent line */}
      <div className="h-[2px] bg-gold-gradient" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden ring-1 ring-luxor-gold/40 shadow-luxor">
                <Image
                  src="/logo.png"
                  alt="Luxor Smart Mall logo"
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-lg block text-white">{t.siteName}</span>
                <span className="text-[10px] tracking-[0.2em] text-luxor-gold">LUXOR SMART MALL</span>
              </div>
            </div>
            <p className="text-white/70 text-sm">{t.tagline}</p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">{t.nav.home}</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/" className="hover:text-luxor-gold transition">{t.nav.home}</Link></li>
              <li><Link href="/stores" className="hover:text-luxor-gold transition">{t.nav.stores}</Link></li>
              <li><Link href="/categories" className="hover:text-luxor-gold transition">{t.nav.categories}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">{t.nav.sell}</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/campaign" className="hover:text-luxor-gold transition">{t.campaign.ctaSeller}</Link></li>
              <li><Link href="/signup" className="hover:text-luxor-gold transition">{t.nav.signup}</Link></li>
              <li><Link href="/dashboard" className="hover:text-luxor-gold transition">{t.nav.dashboard}</Link></li>
              <li><Link href="/dashboard/store" className="hover:text-luxor-gold transition">{t.nav.myStore}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-gold-gradient">Luxor • الأقصر</h4>
            <p className="text-sm text-white/70">
              🏛️ مدينة الأقصر، مصر<br />
              Luxor City, Egypt
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-luxor-gold/20 text-center text-sm text-white/60">
          © {year} <span className="text-luxor-gold">{t.siteName}</span> • {t.common.footer}
        </div>
      </div>
    </footer>
  );
}
