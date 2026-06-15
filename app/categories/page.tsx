import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CroppedImage from '@/components/CroppedImage';
import type { Category } from '@/lib/types';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'الأقسام | الأقصر سمارت مول',
  description: 'تصفّح منتجات الأقصر سمارت مول حسب القسم — تحف، ملابس، مجوهرات، أطعمة، إلكترونيات والمزيد.',
};

export default async function CategoriesPage() {
  const supabase = createClient();

  const [{ data: categoriesRaw }, { data: counts }] = await Promise.all([
    supabase.from('categories').select('*').order('id'),
    supabase.from('products').select('category_id').eq('is_available', true),
  ]);

  const categories = (categoriesRaw ?? []) as Category[];

  // عدد المنتجات لكل قسم (تقريبي — للعرض فقط)
  const countMap = new Map<number, number>();
  (counts ?? []).forEach((row: any) => {
    if (row.category_id == null) return;
    countMap.set(row.category_id, (countMap.get(row.category_id) ?? 0) + 1);
  });

  return (
    <div className="min-h-screen bg-luxor-sandlight/30">
      {/* ─────────── HERO ─────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian">
        <div className="absolute inset-0 pattern-egyptian opacity-20" aria-hidden />
        <div className="absolute -top-24 -end-24 h-96 w-96 rounded-full bg-luxor-gold/20 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-luxor-gold/30 bg-luxor-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-luxor-goldlight">
            <LayoutGrid size={13} />
            أقسام الأقصر سمارت مول
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
            تسوّق حسب <span className="text-gold-gradient">القسم</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/70 md:text-lg">
            اختر القسم الذي يناسبك واكتشف أحدث المنتجات من متاجر الأقصر المعتمدة.
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
      </div>

      {/* ─────────── GRID ─────────── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {categories.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-luxor-gold/30 bg-white p-12 text-center">
            <Package className="mx-auto mb-3 text-luxor-gold" size={44} />
            <p className="text-luxor-navy/70">لا توجد أقسام بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {categories.map((c) => {
              const count = countMap.get(c.id) ?? 0;
              return (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="group relative block overflow-hidden rounded-3xl bg-luxor-obsidian shadow-sm ring-1 ring-luxor-gold/15 transition-all hover:-translate-y-1 hover:shadow-luxor-lg hover:ring-luxor-gold/50"
                >
                  {/* الصورة / الخلفية */}
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {c.image_url ? (
                      <span className="absolute inset-0 block transition-transform duration-700 ease-out group-hover:scale-110">
                        <CroppedImage
                          src={c.image_url}
                          crop={c.image_meta}
                          alt={c.name_ar}
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      </span>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-luxor-charcoal to-luxor-obsidian">
                        <span className="text-6xl opacity-90 drop-shadow-lg md:text-7xl">{c.icon ?? '📦'}</span>
                      </div>
                    )}

                    {/* تدرّج علوي/سفلي لقراءة النص */}
                    <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian via-luxor-obsidian/25 to-transparent" />

                    {/* عدد المنتجات */}
                    {count > 0 && (
                      <span className="absolute end-3 top-3 rounded-full bg-luxor-gold/90 px-2.5 py-0.5 text-[11px] font-black text-luxor-obsidian shadow">
                        {count} منتج
                      </span>
                    )}

                    {/* النص أسفل البطاقة */}
                    <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-4">
                      <h3 className="text-lg font-black leading-tight text-white md:text-xl">{c.name_ar}</h3>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-luxor-goldlight/80">{c.name_en}</p>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white/0 transition-colors group-hover:text-luxor-goldlight">
                        تصفّح القسم
                        <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
                      </span>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-transparent via-luxor-gold to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
