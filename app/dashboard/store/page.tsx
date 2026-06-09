import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import StoreForm from './StoreForm';

export default async function StoreSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">
        {store ? 'إعدادات المتجر' : 'أنشئ متجرك'}
      </h1>
      <StoreForm initialStore={store} userId={user.id} defaultPhone={profile?.phone ?? ''} />
    </div>
  );
}
