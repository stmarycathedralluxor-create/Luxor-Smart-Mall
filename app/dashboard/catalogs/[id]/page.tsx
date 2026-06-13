import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CatalogForm from '../CatalogForm';
import type { Catalog, Store } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EditCatalogPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  const { data: catalog } = await supabase
    .from('catalogs')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!catalog) notFound();
  if (catalog.owner_id !== user.id && !isAdmin) notFound();

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });
  const myStores = (stores ?? []) as Store[];

  // المنتجات المختارة يدوياً (إن وُجدت)
  let initialProductIds: string[] = [];
  if (catalog.filter_type === 'manual') {
    const { data: links } = await supabase
      .from('catalog_products')
      .select('product_id, position')
      .eq('catalog_id', catalog.id)
      .order('position', { ascending: true });
    initialProductIds = (links ?? []).map((l: any) => l.product_id);
  }

  return (
    <div>
      <Link
        href="/dashboard/catalogs"
        className="inline-flex items-center gap-1 text-sm text-luxor-navy/60 hover:text-luxor-gold mb-3"
      >
        <ChevronRight size={16} /> الكتالوجات
      </Link>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">تعديل الكتالوج</h1>
      <CatalogForm
        catalog={catalog as Catalog}
        myStores={myStores}
        isAdmin={isAdmin}
        initialProductIds={initialProductIds}
      />
    </div>
  );
}
