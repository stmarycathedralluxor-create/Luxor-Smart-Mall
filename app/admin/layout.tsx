import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Shield, Users, Store, Package, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-luxor-gold to-luxor-darkgold flex items-center justify-center shadow-luxor">
            <Shield className="text-luxor-navy" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-luxor-navy">لوحة الإدارة</h1>
            <p className="text-sm text-luxor-navy/60">إدارة المنصة بأكملها</p>
          </div>
        </div>
        <Link href="/dashboard" className="btn-outline !py-2 !px-4 !text-sm">
          <ArrowLeft size={16} /> العودة للوحة التحكم
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="space-y-1">
          <AdminLink href="/admin" icon={Shield} label="نظرة عامة" />
          <AdminLink href="/admin/users" icon={Users} label="المستخدمون" />
          <AdminLink href="/admin/stores" icon={Store} label="المتاجر" />
          <AdminLink href="/admin/products" icon={Package} label="المنتجات" />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}

function AdminLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
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
