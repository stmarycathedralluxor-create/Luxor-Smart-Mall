import { createClient } from '@/lib/supabase/server';
import { Users, Store, Package, Eye, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [{ count: userCount }, { count: storeCount }, { count: productCount }, { data: views }] =
    await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('views'),
    ]);

  const totalViews = (views ?? []).reduce((s, p) => s + (p.views ?? 0), 0);

  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentStores } = await supabase
    .from('stores')
    .select('id, name, slug, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="إجمالي المستخدمين" value={userCount ?? 0} color="navy" />
        <Stat icon={Store} label="المتاجر" value={storeCount ?? 0} color="gold" />
        <Stat icon={Package} label="المنتجات" value={productCount ?? 0} color="navy" />
        <Stat icon={Eye} label="إجمالي المشاهدات" value={totalViews} color="gold" />
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
              {recentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-luxor-sandlight"
                >
                  <span className="font-medium text-luxor-navy">{u.full_name || '—'}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-luxor-gold/20 text-luxor-darkgold'
                        : 'bg-white text-luxor-navy/70'
                    }`}
                  >
                    {u.role}
                  </span>
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
              {recentStores.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-luxor-sandlight"
                >
                  <span className="font-medium text-luxor-navy">{s.name}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {s.is_active ? 'نشط' : 'متوقف'}
                  </span>
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
