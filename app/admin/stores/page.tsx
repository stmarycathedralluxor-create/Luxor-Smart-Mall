import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StoreRow from './StoreRow';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminStoresPage() {
  const supabase = createClient();
  const { data: stores } = await supabase
    .from('stores')
    .select('*, owner:profiles(full_name)')
    .order('created_at', { ascending: false });

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
              <th className="text-start p-3">الحالة</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(stores ?? []).map((s: any) => (
              <StoreRow key={s.id} store={s} ownerName={s.owner?.full_name ?? '—'} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
