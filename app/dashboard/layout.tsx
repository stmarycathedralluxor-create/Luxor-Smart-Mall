import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LayoutDashboard, Store, Package, User } from 'lucide-react';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).maybeSingle();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-1">
          <SidebarLink href="/dashboard" icon={LayoutDashboard} label="نظرة عامة" />
          <SidebarLink href="/dashboard/store" icon={Store} label={store ? 'متجري' : 'أنشئ متجرك'} />
          {store && <SidebarLink href="/dashboard/products" icon={Package} label="المنتجات" />}
          <SidebarLink href="/dashboard/profile" icon={User} label="الملف الشخصي" />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

function SidebarLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-luxor-navy hover:bg-luxor-sand/40 font-medium transition"
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
