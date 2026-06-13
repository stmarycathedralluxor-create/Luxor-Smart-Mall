import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Store, Package, User, Shield, BookOpen } from 'lucide-react';

// Dashboards must always show live data — never cache
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // SAFETY NET: ensure a profile row exists for this user.
  // Fixes "violates foreign key constraint" for users who signed up
  // before the on_auth_user_created trigger was installed.
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').insert({
      id: user.id,
      full_name:
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        '',
      phone: (user.user_metadata as any)?.phone || '',
      role: 'buyer',
    });
    const r = await supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
    profile = r.data;
  }

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-1">
          <SidebarLink href="/dashboard" icon={LayoutDashboard} label="نظرة عامة" />
          <SidebarLink href="/dashboard/store" icon={Store} label={store ? 'متجري' : 'أنشئ متجرك'} />
          {store && <SidebarLink href="/dashboard/products" icon={Package} label="المنتجات" />}
          {store && <SidebarLink href="/dashboard/catalogs" icon={BookOpen} label="الكتالوجات" />}
          <SidebarLink href="/dashboard/profile" icon={User} label="الملف الشخصي" />
          {isAdmin && (
            <>
              <div className="border-t border-luxor-sand/60 my-2" />
              <SidebarLink href="/admin" icon={Shield} label="لوحة الإدارة" highlight />
            </>
          )}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  highlight,
}: {
  href: string;
  icon: any;
  label: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
        highlight
          ? 'bg-luxor-gold/15 text-luxor-darkgold hover:bg-luxor-gold/25'
          : 'text-luxor-navy hover:bg-luxor-sand/40'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
