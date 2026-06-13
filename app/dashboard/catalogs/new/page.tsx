import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import CatalogForm from '../CatalogForm';
import type { Store } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewCatalogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  const myStores = (stores ?? []) as Store[];
  if (!myStores.length && !isAdmin) redirect('/dashboard/store');

  return (
    <div>
      <Link
        href="/dashboard/catalogs"
        className="inline-flex items-center gap-1 text-sm text-luxor-navy/60 hover:text-luxor-gold mb-3"
      >
        <ChevronRight size={16} /> الكتالوجات
      </Link>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">كتالوج جديد</h1>
      <CatalogForm myStores={myStores} isAdmin={isAdmin} />
    </div>
  );
}
