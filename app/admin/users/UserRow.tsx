'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

const ROLES = ['buyer', 'seller', 'both', 'admin'] as const;

export default function UserRow({ user }: { user: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState(user.role);
  const [approved, setApproved] = useState(user.is_seller_approved ?? false);
  const [wantsToSell, setWantsToSell] = useState(user.wants_to_sell ?? false);
  const [pending, startTransition] = useTransition();

  const changeRole = async (newRole: typeof ROLES[number]) => {
    setRole(newRole);
    startTransition(async () => {
      const patch: any = { role: newRole };
      // Promoting via role implicitly approves
      if (newRole === 'seller' || newRole === 'both' || newRole === 'admin') {
        patch.is_seller_approved = true;
        setApproved(true);
      }
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) {
        alert(error.message);
        setRole(user.role);
        return;
      }
      router.refresh();
    });
  };

  const approveSeller = () => {
    startTransition(async () => {
      const newRole = role === 'buyer' ? 'seller' : role;
      setApproved(true);
      setRole(newRole as any);
      const { error } = await supabase
        .from('profiles')
        .update({ is_seller_approved: true, role: newRole })
        .eq('id', user.id);
      if (error) {
        setApproved(false);
        return alert(error.message);
      }
      router.refresh();
    });
  };

  return (
    <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
      <td className="p-3 font-medium text-luxor-navy">
        {user.full_name || '—'}
        {wantsToSell && !approved && (
          <div className="text-[10px] mt-0.5 inline-block px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
            طلب تفعيل بائع
          </div>
        )}
      </td>
      <td className="p-3 text-luxor-navy/70 ltr:font-mono" dir="ltr">{user.phone || '—'}</td>
      <td className="p-3 text-luxor-navy/70">{user.city || '—'}</td>
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            role === 'admin'
              ? 'bg-luxor-gold/20 text-luxor-darkgold'
              : role === 'both' || role === 'seller'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {role}
        </span>
      </td>
      <td className="p-3 flex items-center gap-1">
        <select
          value={role}
          onChange={(e) => changeRole(e.target.value as any)}
          disabled={pending}
          className="text-xs px-2 py-1.5 rounded-lg border border-luxor-sand bg-white focus:border-luxor-gold outline-none"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {wantsToSell && !approved && (
          <button
            onClick={approveSeller}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold"
            title="موافقة طلب البائع"
          >
            <Check size={12} /> موافقة
          </button>
        )}
      </td>
    </tr>
  );
}
