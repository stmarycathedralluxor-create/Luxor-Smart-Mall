'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { approveStoreAction, rejectStoreAction } from './actions';

export default function ApproveStoreButton({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | 'approved' | 'rejected'>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = (action: 'approve' | 'reject') =>
    startTransition(async () => {
      setErr(null);
      try {
        const res =
          action === 'approve'
            ? await approveStoreAction(storeId)
            : await rejectStoreAction(storeId);
        if (!res?.ok) {
          setErr(res?.error || 'حدث خطأ');
          return;
        }
        setDone(action === 'approve' ? 'approved' : 'rejected');
        router.refresh();
      } catch (e: any) {
        setErr(e?.message || 'حدث خطأ');
      }
    });

  const approve = () => run('approve');
  const reject = () => {
    if (!confirm('رفض هذا المتجر؟ سيتم حذفه نهائياً مع منتجاته.')) return;
    run('reject');
  };

  if (done === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full font-semibold">
        <Check size={12} /> تم الاعتماد
      </span>
    );
  }
  if (done === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full font-semibold">
        <X size={12} /> تم الحذف
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={approve}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          اعتماد
        </button>
        <button
          onClick={reject}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold disabled:opacity-50"
        >
          <X size={14} /> رفض
        </button>
      </div>
      {err && <span className="text-[11px] text-red-600">{err}</span>}
    </div>
  );
}
