import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StoreRow from './StoreRow';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminStoresPage() {
  const supabase = createClient();
  const [{ data: stores }, { data: visitRows }] = await Promise.all([
    supabase
      .from('stores')
      .select('*, owner:profiles(full_name)')
      .order('created_at', { ascending: false }),
    supabase.from('store_visits').select('store_id'),
  ]);

  // Aggregate visits per store (admin can read store_visits via RLS)
  const visitCounts = new Map<string, number>();
  (visitRows ?? []).forEach((v: any) => {
    visitCounts.set(v.store_id, (visitCounts.get(v.store_id) ?? 0) + 1);
  });

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-luxor-sand/60">
        <h2 className="font-bold text-luxor-navy">المتاجر ({stores?.length ?? 0})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-luxor-sandlight text-luxor-navy">
            <tr>
              <th className="text-start p-3">الاسم</th>
              <th className="text-start p-3">المالك</th>
              <th className="text-start p-3">واتساب</th>
              <th className="text-start p-3">الزيارات</th>
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">مدة التفعيل</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(stores ?? []).map((s: any) => (
              <StoreRow key={s.id} store={s} ownerName={s.owner?.full_name ?? '—'} visitCount={visitCounts.get(s.id) ?? 0} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
