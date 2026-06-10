'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Trash2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Store } from '@/lib/types';

export default function StoreRow({ store, ownerName }: { store: Store; ownerName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState(store.is_active);
  const [approved, setApproved] = useState(store.is_approved ?? false);
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

  const approve = () => {
    startTransition(async () => {
      setApproved(true);
      const { error } = await supabase
        .from('stores')
        .update({ is_approved: true, is_active: true })
        .eq('id', store.id);
      if (error) {
        alert(error.message);
        setApproved(false);
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
        <div className="flex flex-col gap-1">
          <button
            onClick={toggleActive}
            disabled={pending}
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {active ? 'نشط' : 'متوقف'}
          </button>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium text-center ${
              approved ? 'bg-luxor-gold/20 text-luxor-darkgold' : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {approved ? 'موافَق عليه' : 'بانتظار الموافقة'}
          </span>
        </div>
      </td>
      <td className="p-3 flex gap-1 flex-wrap">
        {!approved && (
          <button
            onClick={approve}
            disabled={pending}
            className="p-2 rounded-lg hover:bg-green-50 text-green-700"
            title="اعتماد المتجر"
          >
            <Check size={14} />
          </button>
        )}
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
