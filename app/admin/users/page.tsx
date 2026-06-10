import { createClient } from '@/lib/supabase/server';
import UserRow from './UserRow';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-luxor-sand/60">
        <h2 className="font-bold text-luxor-navy">المستخدمون ({users?.length ?? 0})</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-luxor-sandlight text-luxor-navy">
            <tr>
              <th className="text-start p-3">الاسم</th>
              <th className="text-start p-3">الهاتف</th>
              <th className="text-start p-3">المدينة</th>
              <th className="text-start p-3">الدور</th>
              <th className="text-start p-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <UserRow key={u.id} user={u} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
