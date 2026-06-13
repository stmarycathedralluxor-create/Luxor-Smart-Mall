import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, BookOpen, Eye, Globe, Store as StoreIcon, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import DeleteCatalogButton from './DeleteCatalogButton';
import type { Catalog } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FILTER_LABELS: Record<string, string> = {
  all: 'كل منتجات المتجر',
  price_high: 'الأعلى سعراً',
  rating_high: 'الأعلى تقييماً',
  manual: 'اختيار يدوي',
};

export default async function DashboardCatalogsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
  if (!store) redirect('/dashboard/store');

  const { data: catalogs } = await supabase
    .from('catalogs')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  const list = (catalogs ?? []) as Catalog[];

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-luxor-navy">كتالوجاتي</h1>
        <Link href="/dashboard/catalogs/new" className="btn-primary !py-2 !px-4 !text-sm">
          <Plus size={16} /> كتالوج جديد
        </Link>
      </div>
      <p className="text-sm text-luxor-navy/60 mb-6">
        أنشئ كتالوجاً باسم وحدّد منتجاته بالفلاتر (كل المنتجات / الأعلى سعراً / الأعلى تقييماً) أو باختيار يدوي.
        كتالوجات متجرك تظهر على صفحة متجرك <span className="font-semibold">فوراً بدون موافقة</span>. لجعل الكتالوج
        عاماً في صفحة الكتالوجات الرئيسية يلزم موافقة الإدارة.
      </p>

      {!list.length ? (
        <div className="card p-10 text-center">
          <BookOpen className="mx-auto text-luxor-gold mb-4" size={48} />
          <p className="text-luxor-navy/70 mb-4">لا توجد كتالوجات بعد</p>
          <Link href="/dashboard/catalogs/new" className="btn-primary inline-flex">
            <Plus size={18} /> أنشئ أول كتالوج
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-luxor-navy text-lg truncate">{c.title}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1 bg-luxor-gold/10 text-luxor-darkgold border border-luxor-gold/30 rounded-full px-2 py-0.5 font-bold">
                      <BookOpen size={11} /> {FILTER_LABELS[c.filter_type]}
                    </span>
                    {c.scope === 'global' ? (
                      c.is_approved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full px-2 py-0.5 font-bold">
                          <Globe size={11} /> عام — معتمد
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 font-bold">
                          <Clock size={11} /> عام — بانتظار الموافقة
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-luxor-obsidian/5 text-luxor-navy/70 border border-luxor-navy/15 rounded-full px-2 py-0.5 font-bold">
                        <StoreIcon size={11} /> على متجري
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {c.description && <p className="text-sm text-luxor-navy/60 line-clamp-2 mb-3">{c.description}</p>}
              <div className="flex gap-2">
                <Link href={`/catalog/${c.slug}`} target="_blank" className="btn-outline !py-2 !text-sm flex-1">
                  <Eye size={14} /> معاينة
                </Link>
                <Link href={`/dashboard/catalogs/${c.id}`} className="btn-outline !py-2 !text-sm flex-1">
                  <Edit size={14} /> تعديل
                </Link>
                <DeleteCatalogButton catalogId={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
