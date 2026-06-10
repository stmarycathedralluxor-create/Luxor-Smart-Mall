'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

const ROLES = ['buyer', 'seller', 'both', 'admin'] as const;

export default function UserRow({ user }: { user: Profile }) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState(user.role);
  const [pending, startTransition] = useTransition();

  const changeRole = async (newRole: typeof ROLES[number]) => {
    setRole(newRole);
    startTransition(async () => {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', user.id);
      if (error) {
        alert(error.message);
        setRole(user.role);
        return;
      }
      router.refresh();
    });
  };

  return (
    <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
      <td className="p-3 font-medium text-luxor-navy">{user.full_name || '—'}</td>
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
      <td className="p-3">
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
      </td>
    </tr>
  );
}
