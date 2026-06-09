'use client';

import Link from 'next/link';
import { useLocale } from './LocaleProvider';

export default function Footer() {
  const { t } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-luxor-navy text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-luxor-gold flex items-center justify-center">
                <span className="text-luxor-navy font-bold">L</span>
              </div>
              <span className="font-bold text-lg">{t.siteName}</span>
            </div>
            <p className="text-white/70 text-sm">{t.tagline}</p>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-luxor-gold">{t.nav.home}</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/" className="hover:text-luxor-gold">{t.nav.home}</Link></li>
              <li><Link href="/stores" className="hover:text-luxor-gold">{t.nav.stores}</Link></li>
              <li><Link href="/categories" className="hover:text-luxor-gold">{t.nav.categories}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-luxor-gold">{t.nav.sell}</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li><Link href="/signup" className="hover:text-luxor-gold">{t.nav.signup}</Link></li>
              <li><Link href="/dashboard" className="hover:text-luxor-gold">{t.nav.dashboard}</Link></li>
              <li><Link href="/dashboard/store" className="hover:text-luxor-gold">{t.nav.myStore}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-3 text-luxor-gold">Luxor • الأقصر</h4>
            <p className="text-sm text-white/70">
              🏛️ مدينة الأقصر، مصر<br />
              Luxor City, Egypt
            </p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-white/60">
          © {year} {t.siteName} • {t.common.footer}
        </div>
      </div>
    </footer>
  );
}
