'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, Loader2, Undo2 } from 'lucide-react';
import { approveCatalogAction, rejectCatalogAction } from '../approvals/actions';

export default function ApproveCatalogButton({
  catalogId,
  approved = false,
}: {
  catalogId: string;
  /** عندما يكون الكتالوج معتمداً نعرض زر "إلغاء الاعتماد" بدل "اعتماد" */
  approved?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const run = (action: 'approve' | 'reject') =>
    startTransition(async () => {
      setErr(null);
      try {
        const res =
          action === 'approve'
            ? await approveCatalogAction(catalogId)
            : await rejectCatalogAction(catalogId);
        if (!res?.ok) {
          setErr(res?.error || 'حدث خطأ');
          return;
        }
        // نُحدِّث بيانات الصفحة من الخادم حتى ينتقل الصف بين القائمتين
        router.refresh();
      } catch (e: any) {
        setErr(e?.message || 'حدث خطأ');
      }
    });

  const approve = () => run('approve');
  const reject = () => {
    if (!confirm('إلغاء النشر العام؟ سيبقى الكتالوج على صفحة المتجر فقط.')) return;
    run('reject');
  };

  // الكتالوج معتمد بالفعل → نعرض حالة + زر إلغاء الاعتماد فقط
  if (approved) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={reject}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
          إلغاء الاعتماد
        </button>
        {err && <span className="text-[11px] text-red-600">{err}</span>}
      </div>
    );
  }

  // بانتظار الموافقة → اعتماد / رفض
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={approve}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          اعتماد ونشر
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
