import Link from 'next/link';
import { BookOpen, Layers, Sparkles, Store as StoreIcon, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';
import { resolveCatalogProducts } from '@/lib/catalogs';
import CroppedImage from '@/components/CroppedImage';
import ShareButton from '@/components/ShareButton';
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

  // الكتالوجات العامة المعتمدة فقط (كتالوجات المتاجر تظهر على صفحات متاجرها)
  const { data: catalogsRaw } = await supabase
    .from('catalogs')
    .select('*, store:stores(*)')
    .eq('scope', 'global')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  const catalogs = (catalogsRaw ?? []) as (Catalog & { store?: any })[];

  // احسب صورة الغلاف وعدد المنتجات لكل كتالوج (أول منتج كغلاف افتراضي)
  const cards = await Promise.all(
    catalogs.map(async (c) => {
      const products = await resolveCatalogProducts(supabase, c);
      const cover =
        c.cover_image || products[0]?.images?.[0] || c.store?.cover_url || c.store?.logo_url || null;
      const coverCrop = c.cover_image ? c.cover_meta ?? null : products[0]?.images_meta?.[0] ?? null;
      return { catalog: c, count: products.length, cover, coverCrop };
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
        {visible.length === 0 ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map(({ catalog, count, cover, coverCrop }) => (
              <div
                key={catalog.id}
                className="group relative bg-white rounded-3xl overflow-hidden border border-luxor-gold/20 shadow-sm hover:shadow-luxor-lg hover:border-luxor-gold/50 transition-all"
              >
                <Link href={`/catalog/${catalog.slug}`} className="block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-luxor-obsidian">
                    {cover ? (
                      <span className="absolute inset-0 block group-hover:scale-105 transition-transform duration-700">
                        <CroppedImage src={cover} crop={coverCrop} alt={catalog.title} sizes="(max-width:768px) 100vw, 33vw" />
                      </span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-luxor-gold/30">
                        <BookOpen size={64} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-luxor-obsidian/95 via-luxor-obsidian/20 to-transparent" />
                    <span className="absolute top-3 start-3 inline-flex items-center gap-1 bg-luxor-gold/90 text-luxor-obsidian px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                      <BookOpen size={12} /> كتالوج
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h3 className="font-black text-white text-xl leading-tight line-clamp-2">{catalog.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-white/70 text-xs flex-wrap">
                        {catalog.store?.name && (
                          <span className="inline-flex items-center gap-1">
                            <StoreIcon size={12} className="text-luxor-goldlight" /> {catalog.store.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <Sparkles size={12} className="text-luxor-goldlight" /> {count} منتج
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="p-3 flex items-center justify-between gap-2">
                  <Link
                    href={`/catalog/${catalog.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-luxor-darkgold hover:text-luxor-obsidian transition"
                  >
                    افتح الكتالوج <ArrowLeft size={15} />
                  </Link>
                  <ShareButton
                    variant="icon"
                    path={`/catalog/${catalog.slug}`}
                    title={catalog.title}
                    text={`تصفّح كتالوج «${catalog.title}» على الأقصر سمارت مول`}
                    label="مشاركة الكتالوج"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
