import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from './ProfileForm';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

  return (
    <div>
      <h1 className="text-2xl font-bold text-luxor-navy mb-6">الملف الشخصي</h1>
      <ProfileForm profile={profile} email={user.email ?? ''} />
    </div>
  );
}
