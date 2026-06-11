import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('id');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-luxor-navy mb-3">الأقسام</h1>
        <p className="text-luxor-navy/70">تصفح المنتجات حسب القسم</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {(categories ?? []).map((c) => (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="card p-6 text-center hover:border-luxor-gold hover:-translate-y-1"
          >
            <div className="text-5xl mb-3">{c.icon}</div>
            <h3 className="font-semibold text-luxor-navy">{c.name_ar}</h3>
            <p className="text-xs text-luxor-navy/60 mt-1">{c.name_en}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
