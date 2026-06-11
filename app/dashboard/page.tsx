import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Store,
  Package,
  Eye,
  Plus,
  ExternalLink,
  Tag,
  ShoppingCart,
  Hourglass,
} from 'lucide-react';
import type { StoreCounters } from '@/lib/types';
import { getExpiryInfo } from '@/lib/utils';
import ExpiryCountdown from '@/components/ExpiryCountdown';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();

  let productCount = 0;
  let totalViews = 0;
  let counters: StoreCounters = { visits: 0, price_inquiries: 0, orders: 0 };

  if (store) {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', store.id);
    productCount = count ?? 0;

    const { data: views } = await supabase.from('products').select('views').eq('store_id', store.id);
    totalViews = (views ?? []).reduce((s, p) => s + (p.views ?? 0), 0);

    const { data: c } = await supabase.rpc('get_store_counters', { p_store_id: store.id });
    if (c) counters = c as StoreCounters;
  }

  const isPendingSeller = profile?.wants_to_sell && !profile?.is_seller_approved;
  const expiry = store ? getExpiryInfo(store.expires_at) : null;

  return (
    <div className="space-y-6">
      <div className="card p-6 bg-gradient-to-br from-luxor-navy to-[#1a3a5c] text-white">
        <h1 className="text-2xl font-bold mb-1">
          أهلاً، {profile?.full_name || user.email} 👋
        </h1>
        <p className="text-white/70">لوحة تحكم متجرك في لوكسور سمارت مول</p>
      </div>

      {isPendingSeller && (
        <div className="card p-5 bg-luxor-gold/10 border-luxor-gold/40 flex items-center gap-3">
          <Hourglass className="text-luxor-darkgold" size={22} />
          <div>
            <div className="font-bold text-luxor-navy">طلب تفعيل البائع قيد المراجعة</div>
            <div className="text-xs text-luxor-navy/70">
              ستتمكن من إنشاء متجرك فور موافقة الإدارة.
            </div>
          </div>
        </div>
      )}

      {!store ? (
        <div className="card p-8 text-center">
          <Store className="mx-auto text-luxor-gold mb-4" size={56} />
          <h2 className="text-xl font-bold text-luxor-navy mb-2">
            {isPendingSeller ? 'في انتظار تفعيل البائع' : 'لم تنشئ متجرك بعد'}
          </h2>
          <p className="text-luxor-navy/70 mb-6">
            {isPendingSeller
              ? 'بمجرد موافقة الإدارة على حسابك ستظهر لك واجهة إنشاء المتجر هنا.'
              : 'ابدأ ببيع منتجاتك للعالم بضع خطوات بسيطة'}
          </p>
          {!isPendingSeller && (
            <Link href="/dashboard/store" className="btn-primary inline-flex">
              <Plus size={18} /> أنشئ متجرك الآن
            </Link>
          )}
        </div>
      ) : (
        <>
          {!store.is_approved && (
            <div className="card p-4 bg-luxor-gold/10 border-luxor-gold/40 text-sm text-luxor-navy">
              ⏳ متجرك في انتظار موافقة الإدارة. لن يظهر للعملاء في الصفحات العامة حتى يتم اعتماده.
            </div>
          )}

          {/* Activation period status */}
          {expiry && !expiry.openForever && (
            <div
              className={`card p-5 flex items-center justify-between gap-3 flex-wrap ${
                expiry.expired
                  ? 'bg-red-50 border-red-200'
                  : (expiry.daysLeft ?? 99) <= 3
                    ? 'bg-red-50 border-red-200'
                    : (expiry.daysLeft ?? 99) <= 7
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-green-50 border-green-200'
              }`}
            >
              <div>
                <div className="font-bold text-luxor-navy mb-0.5">
                  {expiry.expired ? '⛔ انتهت فترة تفعيل متجرك' : '⏱️ فترة تفعيل المتجر'}
                </div>
                <div className="text-xs text-luxor-navy/70">
                  {expiry.expired
                    ? 'تم إخفاء متجرك من المنصة. تواصل مع الإدارة لتجديد التفعيل.'
                    : `ينتهي التفعيل بتاريخ ${expiry.expiresAt!.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}. تواصل مع الإدارة للتجديد.`}
                </div>
              </div>
              <ExpiryCountdown expiresAt={store.expires_at} size="lg" />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard icon={Package} label="المنتجات" value={productCount} />
            <StatCard icon={Eye} label="مشاهدات" value={totalViews} />
            <StatCard icon={Store} label="زيارات المتجر" value={counters.visits} />
            <StatCard icon={Tag} label="استعلامات السعر" value={counters.price_inquiries} />
            <StatCard icon={ShoppingCart} label="الطلبات" value={counters.orders} />
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
