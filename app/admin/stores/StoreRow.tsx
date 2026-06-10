'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';

export default function StoreRow({ store, ownerName }: { store: Store; ownerName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState(store.is_active);
  const [pending, startTransition] = useTransition();

  const toggleActive = () => {
    startTransition(async () => {
      const newVal = !active;
      setActive(newVal);
      const { error } = await supabase.from('stores').update({ is_active: newVal }).eq('id', store.id);
      if (error) {
        alert(error.message);
        setActive(!newVal);
        return;
      }
      router.refresh();
    });
  };

  const remove = async () => {
    if (!confirm(`حذف المتجر "${store.name}" وكل منتجاته نهائياً؟`)) return;
    const { error } = await supabase.from('stores').delete().eq('id', store.id);
    if (error) return alert(error.message);
    router.refresh();
  };

  return (
    <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
      <td className="p-3 font-medium text-luxor-navy">{store.name}</td>
      <td className="p-3 text-luxor-navy/70">{ownerName}</td>
      <td className="p-3 text-luxor-navy/70 ltr:font-mono" dir="ltr">{store.whatsapp}</td>
      <td className="p-3">
        <button
          onClick={toggleActive}
          disabled={pending}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {active ? 'نشط' : 'متوقف'}
        </button>
      </td>
      <td className="p-3 flex gap-1">
        <Link
          href={`/stores/${store.slug}`}
          target="_blank"
          className="p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy"
          title="فتح المتجر"
        >
          <ExternalLink size={14} />
        </Link>
        <button
          onClick={remove}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
          title="حذف"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
