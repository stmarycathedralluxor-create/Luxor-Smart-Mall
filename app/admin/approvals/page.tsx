import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Clock, Store as StoreIcon, User } from 'lucide-react';
import ApproveSellerButton from './ApproveSellerButton';
import ApproveStoreButton from './ApproveStoreButton';

export const dynamic = 'force-dynamic';

export default async function AdminApprovalsPage() {
  const supabase = createClient();

  const { data: pendingSellers } = await supabase
    .from('profiles')
    .select('id, full_name, phone, city, created_at, role')
    .eq('wants_to_sell', true)
    .eq('is_seller_approved', false)
    .order('created_at', { ascending: false });

  const { data: pendingStores } = await supabase
    .from('stores')
    .select('*, owner:profiles(full_name, phone)')
    .eq('is_approved', false)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* Sellers */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="text-luxor-gold" size={20} />
          <h2 className="text-xl font-bold text-luxor-navy">طلبات تفعيل بائع</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-luxor-gold/20 text-luxor-darkgold font-bold">
            {pendingSellers?.length ?? 0}
          </span>
        </div>

        <div className="card overflow-hidden">
          {!pendingSellers?.length ? (
            <div className="p-8 text-center text-luxor-navy/60">
              <CheckCircle2 className="mx-auto mb-2 text-green-500" size={32} />
              لا توجد طلبات في الانتظار
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-luxor-sandlight text-luxor-navy">
                  <tr>
                    <th className="text-start p-3">الاسم</th>
                    <th className="text-start p-3">الهاتف</th>
                    <th className="text-start p-3">المدينة</th>
                    <th className="text-start p-3">التاريخ</th>
                    <th className="text-start p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSellers.map((u: any) => (
                    <tr key={u.id} className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
                      <td className="p-3 font-medium text-luxor-navy">{u.full_name || '—'}</td>
                      <td className="p-3 text-luxor-navy/70 ltr:font-mono" dir="ltr">{u.phone || '—'}</td>
                      <td className="p-3 text-luxor-navy/70">{u.city || '—'}</td>
                      <td className="p-3 text-luxor-navy/60 text-xs">
                        {new Date(u.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3">
                        <ApproveSellerButton userId={u.id} currentRole={u.role} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Stores */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <StoreIcon className="text-luxor-gold" size={20} />
          <h2 className="text-xl font-bold text-luxor-navy">متاجر بانتظار الموافقة</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-luxor-gold/20 text-luxor-darkgold font-bold">
            {pendingStores?.length ?? 0}
          </span>
        </div>

        <div className="card overflow-hidden">
          {!pendingStores?.length ? (
            <div className="p-8 text-center text-luxor-navy/60">
              <CheckCircle2 className="mx-auto mb-2 text-green-500" size={32} />
              لا توجد متاجر بانتظار الموافقة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-luxor-sandlight text-luxor-navy">
                  <tr>
                    <th className="text-start p-3">المتجر</th>
                    <th className="text-start p-3">المالك</th>
                    <th className="text-start p-3">واتساب</th>
                    <th className="text-start p-3">المدينة</th>
                    <th className="text-start p-3">التاريخ</th>
                    <th className="text-start p-3">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingStores.map((s: any) => (
                    <tr key={s.id} className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
                      <td className="p-3 font-medium text-luxor-navy">
                        <div>{s.name}</div>
                        <div className="text-xs text-luxor-navy/60">/{s.slug}</div>
                      </td>
                      <td className="p-3 text-luxor-navy/70">{s.owner?.full_name ?? '—'}</td>
                      <td className="p-3 text-luxor-navy/70 ltr:font-mono" dir="ltr">{s.whatsapp}</td>
                      <td className="p-3 text-luxor-navy/70">{s.city || '—'}</td>
                      <td className="p-3 text-luxor-navy/60 text-xs">
                        {new Date(s.created_at).toLocaleDateString('ar-EG')}
                      </td>
                      <td className="p-3">
                        <ApproveStoreButton storeId={s.id} />
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
