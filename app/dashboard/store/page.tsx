import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import StoreForm from './StoreForm';
import { Hourglass, Store as StoreIcon } from 'lucide-react';

export default async function StoreSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  // 1) لو ما طلبش يبقى بائع → يعرض زر طلب
  // 2) لو طلب لكن لسه ما اتوافق عليه → يعرض شاشة "قيد المراجعة"
  // 3) لو اتوافق → يعرض الفورم
  const isApprovedSeller =
    profile?.is_seller_approved === true || profile?.role === 'admin';

  if (!isApprovedSeller) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto">
        <Hourglass className="mx-auto text-luxor-gold mb-4" size={56} />
        <h2 className="text-xl font-bold text-luxor-navy mb-2">
          {profile?.wants_to_sell ? 'طلبك قيد المراجعة' : 'فعّل حساب البائع أولاً'}
        </h2>
        <p className="text-luxor-navy/70 mb-6">
          {profile?.wants_to_sell
            ? 'تم استلام طلبك ليصبح حسابك بائعاً، وسيتم إخطارك فور موافقة الإدارة. لا يمكنك فتح متجر قبل التفعيل.'
            : 'لفتح متجر تحتاج أولاً تفعيل حساب البائع. اضغط الزر بالأسفل لإرسال طلب التفعيل للإدارة.'}
        </p>
        {!profile?.wants_to_sell && (
          <form
            action={async () => {
              'use server';
              const s = createClient();
              const { data: { user: u } } = await s.auth.getUser();
              if (u) {
                await s.from('profiles').update({ wants_to_sell: true }).eq('id', u.id);
              }
              redirect('/dashboard/store');
            }}
          >
            <button className="btn-primary" type="submit">
              <StoreIcon size={18} /> إرسال طلب فتح حساب بائع
            </button>
          </form>
        )}
        {profile?.wants_to_sell && (
          <Link href="/dashboard" className="btn-outline inline-flex">العودة للوحة التحكم</Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">
        {store ? 'إعدادات المتجر' : 'أنشئ متجرك'}
      </h1>

      {store && !store.is_approved && (
        <div className="card p-4 mb-5 bg-luxor-gold/10 border-luxor-gold/40 text-sm text-luxor-navy">
          ⏳ متجرك تم إنشاؤه وفي انتظار موافقة الإدارة. لن يظهر للعملاء قبل التفعيل.
        </div>
      )}

      <StoreForm initialStore={store} userId={user.id} defaultPhone={profile?.phone ?? ''} />
    </div>
  );
}
