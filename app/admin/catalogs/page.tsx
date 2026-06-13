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

  // نجلب كل الكتالوجات العامة دفعةً واحدة بدون ربط المتجر (الربط الداخلي
  // قد يحذف الصفوف بصمت بسبب RLS على stores). نجلب أسماء المتاجر منفصلاً.
  const { data: globalRaw, error: globalErr } = await supabase
    .from('catalogs')
    .select('*')
    .eq('scope', 'global')
    .order('created_at', { ascending: false });

  const allGlobal = (globalRaw ?? []) as Catalog[];

  // اجلب أسماء المتاجر المرتبطة (مرّة واحدة)
  const storeIds = Array.from(new Set(allGlobal.map((c) => c.store_id).filter(Boolean))) as string[];
  const storeMap = new Map<string, { name: string; slug: string }>();
  if (storeIds.length) {
    const { data: stores } = await supabase.from('stores').select('id, name, slug').in('id', storeIds);
    (stores ?? []).forEach((s: any) => storeMap.set(s.id, { name: s.name, slug: s.slug }));
  }

  const withStore = (c: Catalog) => ({ ...c, store: c.store_id ? storeMap.get(c.store_id) ?? null : null });

  const pending = allGlobal.filter((c) => !c.is_approved).map(withStore) as (Catalog & { store?: any })[];
  const approved = allGlobal.filter((c) => c.is_approved).map(withStore) as (Catalog & { store?: any })[];
  const loadError = globalErr?.message ?? null;

  return (
    <div className="space-y-8">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          تعذّر تحميل الكتالوجات: {loadError}
        </div>
      )}
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
        <p className="mt-2 text-[11px] text-luxor-navy/50">
          ملاحظة: إذا لم يثبت الاعتماد، شغّل المايجريشن{' '}
          <code className="bg-luxor-sandlight px-1 rounded">supabase/migrations/0014_catalogs_admin_update.sql</code>{' '}
          في Supabase مرة واحدة.
        </p>
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
                        <ApproveCatalogButton catalogId={c.id} approved />
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
