import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 text-center">
      <div>
        <div className="text-9xl font-bold text-luxor-gold mb-4">404</div>
        <h1 className="text-2xl font-bold text-luxor-navy mb-3">الصفحة غير موجودة</h1>
        <p className="text-luxor-navy/70 mb-6">يبدو أن الصفحة التي تبحث عنها غير متاحة</p>
        <Link href="/" className="btn-primary inline-flex">
          <Home size={18} /> العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
