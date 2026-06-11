import { createClient } from '@/lib/supabase/server';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import NotifyButton from './NotifyButton';
import { AlarmClock, BellRing, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export type ExpiringStore = {
  store_id: string;
  store_name: string;
  store_slug: string;
  whatsapp: string;
  owner_name: string | null;
  expires_at: string;
  days_left: number;
  kind: 'reminder_3d' | 'reminder_1d' | 'closure';
};

const KIND_LABEL: Record<string, string> = {
  reminder_3d: 'تذكير: 3 أيام متبقية',
  reminder_1d: 'تذكير: يوم واحد متبقٍ',
  closure: 'إغلاق: انتهت المدة',
};

export default async function AdminExpiryPage() {
  const supabase = createClient();

  // Pending notifications (3-day / 1-day / closure) not yet sent
  let pending: ExpiringStore[] = [];
  try {
    const { data } = await supabase.rpc('get_expiring_stores');
    pending = (data as ExpiringStore[]) ?? [];
  } catch {
    /* migration 0005 not run yet */
  }

  // All stores with a limited activation period (overview list)
  const { data: limitedStores } = await supabase
    .from('stores')
    .select('id, name, slug, whatsapp, expires_at, is_active')
    .not('expires_at', 'is', null)
    .order('expires_at', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="card p-5 bg-gradient-to-br from-luxor-navy to-[#1a3a5c] text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BellRing size={20} className="text-luxor-goldlight" />
          تذكيرات انتهاء التفعيل
        </h2>
        <p className="text-white/70 text-sm mt-1">
          رسائل واتساب جاهزة: تذكير قبل 3 أيام، تذكير قبل يوم واحد، ورسالة إغلاق عند انتهاء المدة.
          الضغط على «إرسال» يفتح واتساب برسالة جاهزة ويسجّل الإرسال (رسالة الإغلاق توقف المتجر تلقائياً).
        </p>
      </div>

      {/* Pending reminders */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-luxor-sand/60 flex items-center gap-2">
          <AlarmClock size={18} className="text-luxor-darkgold" />
          <h3 className="font-bold text-luxor-navy">
            رسائل بانتظار الإرسال ({pending.length})
          </h3>
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-luxor-navy/60">
            <CheckCircle2 className="mx-auto mb-2 text-green-500" size={36} />
            لا توجد تذكيرات مستحقة الآن — كل المتاجر تم تنبيهها ✅
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-luxor-sandlight text-luxor-navy">
                <tr>
                  <th className="text-start p-3">المتجر</th>
                  <th className="text-start p-3">المالك</th>
                  <th className="text-start p-3">نوع الرسالة</th>
                  <th className="text-start p-3">ينتهي في</th>
                  <th className="text-start p-3">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr
                    key={`${row.store_id}-${row.kind}`}
                    className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40"
                  >
                    <td className="p-3 font-medium text-luxor-navy">{row.store_name}</td>
                    <td className="p-3 text-luxor-navy/70">{row.owner_name ?? '—'}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-bold ${
                          row.kind === 'closure'
                            ? 'bg-red-100 text-red-700'
                            : row.kind === 'reminder_1d'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {KIND_LABEL[row.kind]}
                      </span>
                    </td>
                    <td className="p-3 text-luxor-navy/70 text-xs" dir="ltr">
                      {new Date(row.expires_at).toLocaleString('ar-EG')}
                    </td>
                    <td className="p-3">
                      <NotifyButton row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overview of all limited-period stores */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-luxor-sand/60">
          <h3 className="font-bold text-luxor-navy">
            المتاجر ذات المدة المحدودة ({limitedStores?.length ?? 0})
          </h3>
        </div>
        {!limitedStores?.length ? (
          <div className="p-6 text-center text-luxor-navy/60 text-sm">
            كل المتاجر حالياً «مفتوحة للأبد». يمكنك تحديد مدة تفعيل من صفحة المتاجر.
          </div>
        ) : (
          <ul className="divide-y divide-luxor-sand/40">
            {limitedStores.map((s: any) => (
              <li key={s.id} className="flex items-center justify-between p-4 gap-3 flex-wrap">
                <div>
                  <div className="font-medium text-luxor-navy">{s.name}</div>
                  <div className="text-[11px] text-luxor-navy/50" dir="ltr">
                    ينتهي: {new Date(s.expires_at).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!s.is_active && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      متوقف
                    </span>
                  )}
                  <ExpiryCountdown expiresAt={s.expires_at} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
