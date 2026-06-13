import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Clock, BookOpen, Eye, Globe } from 'lucide-react';
import ApproveCatalogButton from './ApproveCatalogButton';
import type { Catalog } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FILTER_LABELS: Record<string, string> = {
  all: 'كل منتجات المتجر',
  price_high: 'الأعلى سعراً',
  rating_high: 'الأعلى تقييماً',
  manual: 'اختيار يدوي',
};

export default async function AdminCatalogsPage() {
  const supabase = createClient();

  // الكتالوجات العامة بانتظار الموافقة
  const { data: pendingRaw } = await supabase
    .from('catalogs')
    .select('*, store:stores(name, slug)')
    .eq('scope', 'global')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  // الكتالوجات العامة المعتمدة (للمراجعة)
  const { data: approvedRaw } = await supabase
    .from('catalogs')
    .select('*, store:stores(name, slug)')
    .eq('scope', 'global')
    .eq('is_approved', true)
    .order('created_at', { ascending: false });

  const pending = (pendingRaw ?? []) as (Catalog & { store?: any })[];
  const approved = (approvedRaw ?? []) as (Catalog & { store?: any })[];

  return (
    <div className="space-y-8">
      {/* بانتظار الموافقة */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="text-luxor-gold" size={20} />
          <h2 className="text-xl font-bold text-luxor-navy">كتالوجات عامة بانتظار الموافقة</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-luxor-gold/20 text-luxor-darkgold font-bold">
            {pending.length}
          </span>
        </div>

        <div className="card overflow-hidden">
          {!pending.length ? (
            <div className="p-8 text-center text-luxor-navy/60">
              <CheckCircle2 className="mx-auto mb-2 text-green-500" size={32} />
              لا توجد كتالوجات بانتظار الموافقة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-luxor-sandlight text-luxor-navy">
                  <tr>
                    <th className="text-start p-3">الكتالوج</th>
                    <th className="text-start p-3">المتجر</th>
                    <th className="text-start p-3">الطريقة</th>
                    <th className="text-start p-3">معاينة</th>
                    <th className="text-start p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((c) => (
                    <tr key={c.id} className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
                      <td className="p-3 font-medium text-luxor-navy">
                        <div className="flex items-center gap-2">
                          <BookOpen size={14} className="text-luxor-gold" /> {c.title}
                        </div>
                        {c.description && (
                          <div className="text-xs text-luxor-navy/50 line-clamp-1 mt-0.5">{c.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-luxor-navy/70">{c.store?.name ?? '—'}</td>
                      <td className="p-3 text-luxor-navy/70">{FILTER_LABELS[c.filter_type]}</td>
                      <td className="p-3">
                        <Link
                          href={`/catalog/${c.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-luxor-darkgold hover:underline text-xs font-semibold"
                        >
                          <Eye size={13} /> فتح
                        </Link>
                      </td>
                      <td className="p-3">
                        <ApproveCatalogButton catalogId={c.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* المعتمدة */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="text-luxor-gold" size={20} />
          <h2 className="text-xl font-bold text-luxor-navy">كتالوجات عامة معتمدة</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
            {approved.length}
          </span>
        </div>

        <div className="card overflow-hidden">
          {!approved.length ? (
            <div className="p-8 text-center text-luxor-navy/60">لا توجد كتالوجات معتمدة بعد</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-luxor-sandlight text-luxor-navy">
                  <tr>
                    <th className="text-start p-3">الكتالوج</th>
                    <th className="text-start p-3">المتجر</th>
                    <th className="text-start p-3">معاينة</th>
                    <th className="text-start p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.map((c) => (
                    <tr key={c.id} className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
                      <td className="p-3 font-medium text-luxor-navy">{c.title}</td>
                      <td className="p-3 text-luxor-navy/70">{c.store?.name ?? '—'}</td>
                      <td className="p-3">
                        <Link
                          href={`/catalog/${c.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-luxor-darkgold hover:underline text-xs font-semibold"
                        >
                          <Eye size={13} /> فتح
                        </Link>
                      </td>
                      <td className="p-3">
                        <ApproveCatalogButton catalogId={c.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
