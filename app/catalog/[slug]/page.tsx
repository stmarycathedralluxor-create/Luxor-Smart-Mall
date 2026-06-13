import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Store as StoreIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/utils';
import { resolveCatalogProducts } from '@/lib/catalogs';
import MagazineFlipbook from '@/components/MagazineFlipbook';
import ShareButton from '@/components/ShareButton';
import type { Catalog } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function loadCatalog(slug: string) {
  const supabase = createClient();
  const { data: catalog } = await supabase
    .from('catalogs')
    .select('*, store:stores(*)')
    .eq('slug', slug)
    .maybeSingle();
  return { supabase, catalog: catalog as (Catalog & { store?: any }) | null };
}

/** OG/Twitter metadata — مشاركة الكتالوج تعرض صورة غلافه أو أول منتج. */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { supabase, catalog } = await loadCatalog(params.slug);
  if (!catalog) return { title: 'كتالوج غير موجود | الأقصر سمارت مول' };

  const products = await resolveCatalogProducts(supabase, catalog);
  const image =
    catalog.cover_image ||
    products[0]?.images?.[0] ||
    catalog.store?.cover_url ||
    catalog.store?.logo_url ||
    undefined;

  const title = `${catalog.title} | كتالوج الأقصر سمارت مول`;
  const description =
    catalog.description?.slice(0, 160) ||
    `تصفّح كتالوج «${catalog.title}» على الأقصر سمارت مول${catalog.store?.name ? ` من متجر ${catalog.store.name}` : ''}`;
  const url = absoluteUrl(`/catalog/${params.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: image ? [{ url: image, alt: catalog.title }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CatalogPage({ params }: { params: { slug: string } }) {
  const { supabase, catalog } = await loadCatalog(params.slug);
  if (!catalog) notFound();

  // الكتالوجات العامة غير المعتمدة لا تُعرَض للعامة
  if (catalog.scope === 'global' && !catalog.is_approved) notFound();

  const products = await resolveCatalogProducts(supabase, catalog);

  return (
    <div className="bg-luxor-sandlight/30 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb + share */}
        <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
          <nav className="text-sm text-luxor-navy/60 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-luxor-gold">الرئيسية</Link>
            <span>/</span>
            <Link href="/catalog" className="hover:text-luxor-gold">الكتالوجات</Link>
            <span>/</span>
            <span className="text-luxor-navy/80">{catalog.title}</span>
          </nav>
          <div className="flex items-center gap-2">
            {catalog.store?.slug && (
              <Link
                href={`/stores/${catalog.store.slug}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-luxor-darkgold border border-luxor-gold/40 hover:bg-luxor-gold/10 rounded-full px-3 py-1.5 transition"
              >
                <StoreIcon size={13} /> {catalog.store.name}
              </Link>
            )}
            <ShareButton
              path={`/catalog/${catalog.slug}`}
              title={catalog.title}
              text={`تصفّح كتالوج «${catalog.title}» على الأقصر سمارت مول`}
              label="مشاركة الكتالوج"
            />
          </div>
        </div>

        {catalog.description && (
          <p className="text-luxor-navy/70 mb-5 max-w-3xl leading-relaxed">{catalog.description}</p>
        )}

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-luxor-gold/30 p-12 text-center">
            <h3 className="text-xl font-bold text-luxor-obsidian mb-2">هذا الكتالوج فارغ حالياً</h3>
            <p className="text-luxor-obsidian/60 mb-4">لا توجد منتجات متاحة للعرض في هذا الكتالوج.</p>
            <Link href="/catalog" className="btn-outline inline-flex">
              <ChevronLeft size={16} className="rtl:rotate-180" /> العودة للكتالوجات
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-luxor-gold/20 shadow-sm p-4 md:p-8">
            <MagazineFlipbook
              title={catalog.title}
              products={products}
              storeName={catalog.store?.name ?? null}
              coverImage={catalog.cover_image}
            />
          </div>
        )}
      </div>
    </div>
  );
}
