import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Users,
  Store,
  Package,
  Eye,
  TrendingUp,
  Globe,
  Tag,
  ShoppingCart,
  Clock,
  BellRing,
} from 'lucide-react';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import type { AdminCounters } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { count: userCount },
    { count: storeCount },
    { count: productCount },
    { data: views },
    { data: countersData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('stores').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('views'),
    supabase.rpc('get_admin_counters'),
  ]);

  const counters: AdminCounters = (countersData as AdminCounters) ?? {
    site_visits: 0,
    store_visits: 0,
    price_inquiries: 0,
    orders: 0,
    pending_sellers: 0,
    pending_stores: 0,
  };

  const totalViews = (views ?? []).reduce((s, p) => s + (p.views ?? 0), 0);

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at, wants_to_sell, is_seller_approved')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentStores } = await supabase
    .from('stores')
    .select('id, name, slug, is_active, is_approved, expires_at, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  // Pending expiry reminders (gracefully degrades if migration 0005 hasn't run)
  let pendingReminders = 0;
  try {
    const { data: expiring } = await supabase.rpc('get_expiring_stores');
    pendingReminders = (expiring ?? []).length;
  } catch {
    /* migration 0005 not run yet */
  }

  return (
    <div className="space-y-6">
      {pendingReminders > 0 && (
        <Link
          href="/admin/expiry"
          className="card p-4 flex items-center gap-3 bg-red-50 border-red-200 hover:border-red-400 transition"
        >
          <BellRing className="text-red-600" size={22} />
          <div className="flex-1">
            <div className="font-bold text-luxor-navy">
              {pendingReminders} تذكير انتهاء تفعيل بانتظار الإرسال
            </div>
            <div className="text-xs text-luxor-navy/70">
              رسائل واتساب جاهزة (3 أيام / يوم واحد / إغلاق)
            </div>
          </div>
          <span className="btn-primary !py-2 !px-3 !text-xs">إرسال الآن</span>
        </Link>
      )}

      {(counters.pending_sellers > 0 || counters.pending_stores > 0) && (
        <Link
          href="/admin/approvals"
          className="card p-4 flex items-center gap-3 bg-luxor-gold/10 border-luxor-gold/40 hover:border-luxor-gold transition"
        >
          <Clock className="text-luxor-darkgold" size={22} />
          <div className="flex-1">
            <div className="font-bold text-luxor-navy">
              لديك {counters.pending_sellers + counters.pending_stores} طلب بانتظار المراجعة
            </div>
            <div className="text-xs text-luxor-navy/70">
              {counters.pending_sellers} طلب تفعيل بائع · {counters.pending_stores} متجر جديد
            </div>
          </div>
          <span className="btn-primary !py-2 !px-3 !text-xs">مراجعة الآن</span>
        </Link>
      )}

      <div>
        <h2 className="text-sm font-bold text-luxor-navy/70 mb-3 uppercase tracking-wide">
          إحصائيات التفاعل
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Globe} label="زيارات الموقع" value={counters.site_visits} color="navy" />
          <Stat icon={Store} label="زيارات المتاجر" value={counters.store_visits} color="gold" />
          <Stat icon={Tag} label="استعلامات الأسعار" value={counters.price_inquiries} color="navy" />
          <Stat icon={ShoppingCart} label="الطلبات (واتساب)" value={counters.orders} color="gold" />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-luxor-navy/70 mb-3 uppercase tracking-wide">
          إحصائيات عامة
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat icon={Users} label="إجمالي المستخدمين" value={userCount ?? 0} color="navy" />
          <Stat icon={Store} label="المتاجر" value={storeCount ?? 0} color="gold" />
          <Stat icon={Package} label="المنتجات" value={productCount ?? 0} color="navy" />
          <Stat icon={Eye} label="مشاهدات المنتجات" value={totalViews} color="gold" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold text-luxor-navy mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-luxor-gold" /> أحدث المستخدمين
          </h3>
          {!recentUsers?.length ? (
            <p className="text-sm text-luxor-navy/60">لا يوجد مستخدمون بعد</p>
          ) : (
            <ul className="space-y-2">
              {recentUsers.map((u: any) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-luxor-sandlight"
                >
                  <span className="font-medium text-luxor-navy">{u.full_name || '—'}</span>
                  <div className="flex items-center gap-2">
                    {u.wants_to_sell && !u.is_seller_approved && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        بانتظار التفعيل
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        u.role === 'admin'
                          ? 'bg-luxor-gold/20 text-luxor-darkgold'
                          : 'bg-white text-luxor-navy/70'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <h3 className="font-bold text-luxor-navy mb-4 flex items-center gap-2">
            <Store size={18} className="text-luxor-gold" /> أحدث المتاجر
          </h3>
          {!recentStores?.length ? (
            <p className="text-sm text-luxor-navy/60">لا توجد متاجر بعد</p>
          ) : (
            <ul className="space-y-2">
              {recentStores.map((s: any) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-luxor-sandlight"
                >
                  <span className="font-medium text-luxor-navy">{s.name}</span>
                  <div className="flex items-center gap-2">
                    {s.expires_at && <ExpiryCountdown expiresAt={s.expires_at} size="sm" />}
                    {!s.is_approved && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                        بانتظار الموافقة
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        s.is_active && s.is_approved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {s.is_active && s.is_approved ? 'نشط' : 'متوقف'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  color: 'navy' | 'gold';
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            color === 'gold' ? 'bg-luxor-gold/20 text-luxor-gold' : 'bg-luxor-navy/10 text-luxor-navy'
          }`}
        >
          <Icon size={20} />
        </div>
        <span className="text-sm text-luxor-navy/70">{label}</span>
      </div>
      <div className="text-3xl font-bold text-luxor-navy">{value.toLocaleString('ar-EG')}</div>
    </div>
  );
}
