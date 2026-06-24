import Link from 'next/link';
import { BookOpen, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { resolveCatalogProducts } from '@/lib/catalogs';
import CatalogCard from '@/components/CatalogCard';
import type { Catalog } from '@/lib/types';

// Always render fresh data — ISR caching made deletes/updates appear with a delay
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: 'الكتالوجات | الأقصر سمارت مول',
  description: 'تصفّح كتالوجات الأقصر سمارت مول على هيئة مجلات تفاعلية تُقلَّب صفحاتها — كتالوجات مختارة من الإدارة والبائعين.',
};

export default async function CatalogsPage() {
  const supabase = createClient();

  // الكتالوجات العامة المعتمدة فقط (كتالوجات المتاجر تظهر على صفحات متاجرها).
  // مهم: لا نربط المتجر داخل الاستعلام (embedded join) لأنه يتصرّف كـ
  // inner join ويحذف الكتالوج بصمت عندما لا يكون متجره active+approved
  // بسبب RLS — فيختفي الكتالوج المعتمد من الصفحة. نجلب المتاجر منفصلاً.
  const { data: catalogsRaw, error: catalogsError } = await supabase
    .from('catalogs')
    .select('*')
    .eq('scope', 'global')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  const tableMissing =
    !!catalogsError &&
    /relation .*catalogs.* does not exist|could not find the table/i.test(catalogsError.message || '');

  const catalogs = (catalogsRaw ?? []) as (Catalog & { store?: any })[];

  // اجلب المتاجر المرتبطة منفصلاً (اختياري للعرض فقط)
  const storeIds = Array.from(new Set(catalogs.map((c) => c.store_id).filter(Boolean))) as string[];
  if (storeIds.length) {
    const { data: stores } = await supabase.from('stores').select('*').in('id', storeIds);
    const storeMap = new Map<string, any>((stores ?? []).map((s: any) => [s.id, s]));
    catalogs.forEach((c) => {
      if (c.store_id) c.store = storeMap.get(c.store_id) ?? null;
    });
  }

  // اجلب منتجات كل كتالوج (لعرض الكارت المتحرّك بصورة واحدة لكل منتج)
  const cards = await Promise.all(
    catalogs.map(async (c) => {
      const products = await resolveCatalogProducts(supabase, c);
      return { catalog: c, products, count: products.length };
    })
  );

  // أخفِ الكتالوجات الفارغة
  const visible = cards.filter((c) => c.count > 0);

  return (
    <div className="bg-luxor-sandlight/30 min-h-screen">
      {/* HERO */}
      <div className="relative overflow-hidden bg-gradient-to-br from-luxor-obsidian via-luxor-charcoal to-luxor-obsidian">
        <div className="absolute inset-0 pattern-egyptian opacity-20" aria-hidden />
        <div className="absolute -top-24 -end-24 w-96 h-96 rounded-full bg-luxor-gold/20 blur-3xl" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 bg-luxor-gold/15 border border-luxor-gold/30 text-luxor-goldlight px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4">
                <BookOpen size={13} /> كتالوجات الأقصر سمارت مول
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                <span className="text-gold-gradient">الكتالوجات</span> التفاعلية
              </h1>
              <p className="text-white/70 text-base md:text-lg max-w-2xl mt-3">
                مجلات حقيقية تُقلَّب صفحاتها — اختر كتالوجاً وتصفّح منتجاته صفحةً صفحة، واضغط أي منتج لفتح صفحته.
              </p>
            </div>
            <Link
              href="/catalog/browse"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-luxor-gold bg-white/10 backdrop-blur text-white font-bold px-4 py-3 hover:bg-luxor-gold hover:text-luxor-obsidian transition shrink-0"
            >
              <Layers size={18} /> تصفّح كل المنتجات
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-luxor-gold to-transparent" />
      </div>

      {/* CATALOGS GRID */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {tableMissing ? (
          <div className="bg-amber-50 rounded-3xl border-2 border-amber-300 p-8 text-center">
            <h3 className="text-xl font-bold text-amber-800 mb-2">ميزة الكتالوجات تحتاج تفعيلاً لمرّة واحدة</h3>
            <p className="text-amber-700/80 max-w-xl mx-auto mb-4 leading-relaxed">
              لتشغيل الكتالوجات، افتح <span className="font-bold">Supabase → SQL Editor</span> وشغّل ملف
              المايجريشن:
              <code className="block mt-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 font-mono text-sm text-amber-900">
                supabase/migrations/0013_catalogs.sql
              </code>
            </p>
            <Link href="/catalog/browse" className="btn-outline inline-flex">
              <Layers size={16} /> تصفّح كل المنتجات الآن
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-luxor-gold/30 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-luxor-gold/10 mb-4">
              <BookOpen className="text-luxor-gold" size={40} />
            </div>
            <h3 className="text-xl font-bold text-luxor-obsidian mb-2">لا توجد كتالوجات منشورة بعد</h3>
            <p className="text-luxor-obsidian/60 max-w-md mx-auto mb-4">
              يمكنك تصفّح كل المنتجات بطريقة المجلة من الزر بالأعلى.
            </p>
            <Link href="/catalog/browse" className="btn-outline inline-flex">
              <Layers size={16} /> تصفّح كل المنتجات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-8">
            {visible.map(({ catalog, products, count }) => (
              <CatalogCard
                key={catalog.id}
                title={catalog.title}
                slug={catalog.slug}
                products={products}
                count={count}
                store={
                  catalog.store
                    ? {
                        name: catalog.store.name,
                        slug: catalog.store.slug,
                        logo_url: catalog.store.logo_url ?? null,
                      }
                    : null
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
