import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Store, Package, Eye, Plus, ExternalLink } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();

  let productCount = 0;
  let totalViews = 0;
  if (store) {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);
    productCount = count ?? 0;

    const { data: views } = await supabase.from('products').select('views').eq('store_id', store.id);
    totalViews = (views ?? []).reduce((s, p) => s + (p.views ?? 0), 0);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-luxor-navy to-[#1a3a5c] text-white">
        <h1 className="text-2xl font-bold mb-1">
          أهلاً، {profile?.full_name || user.email} 👋
        </h1>
        <p className="text-white/70">لوحة تحكم متجرك في لوكسور سمارت مول</p>
      </div>

      {!store ? (
        <div className="card p-8 text-center">
          <Store className="mx-auto text-luxor-gold mb-4" size={56} />
          <h2 className="text-xl font-bold text-luxor-navy mb-2">لم تنشئ متجرك بعد</h2>
          <p className="text-luxor-navy/70 mb-6">ابدأ ببيع منتجاتك للعالم بضع خطوات بسيطة</p>
          <Link href="/dashboard/store" className="btn-primary inline-flex">
            <Plus size={18} /> أنشئ متجرك الآن
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Package} label="المنتجات" value={productCount} />
            <StatCard icon={Eye} label="إجمالي المشاهدات" value={totalViews} />
            <StatCard icon={Store} label="حالة المتجر" value={store.is_active ? 'نشط ✅' : 'غير نشط'} />
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-luxor-navy">{store.name}</h2>
                <p className="text-luxor-navy/60 text-sm">luxorsmartmall.com/stores/{store.slug}</p>
              </div>
              <Link href={`/stores/${store.slug}`} target="_blank" className="btn-outline !py-2 !px-4 !text-sm">
                <ExternalLink size={16} /> زيارة المتجر
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/products/new" className="btn-primary !py-2 !px-4 !text-sm">
                <Plus size={16} /> أضف منتج جديد
              </Link>
              <Link href="/dashboard/products" className="btn-secondary !py-2 !px-4 !text-sm">
                <Package size={16} /> إدارة المنتجات
              </Link>
              <Link href="/dashboard/store" className="btn-outline !py-2 !px-4 !text-sm">
                إعدادات المتجر
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-luxor-gold/20 flex items-center justify-center text-luxor-gold">
          <Icon size={20} />
        </div>
        <span className="text-sm text-luxor-navy/70">{label}</span>
      </div>
      <div className="text-2xl font-bold text-luxor-navy">{value}</div>
    </div>
  );
}
