'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ApproveSellerButton({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  const approve = () => {
    startTransition(async () => {
      // Promote to seller (or 'both' if they already had buyer)
      const newRole =
        currentRole === 'buyer' || !currentRole ? 'seller' : currentRole;

      const { error } = await supabase
        .from('profiles')
        .update({ is_seller_approved: true, role: newRole })
        .eq('id', userId);

      if (error) return alert(error.message);
      setDone(true);
      router.refresh();
    });
  };

  const reject = () => {
    if (!confirm('رفض طلب تفعيل البائع لهذا المستخدم؟')) return;
    startTransition(async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ wants_to_sell: false, is_seller_approved: false })
        .eq('id', userId);
      if (error) return alert(error.message);
      setDone(true);
      router.refresh();
    });
  };

  if (done) {
    return <span className="text-xs text-green-600 font-medium">تم</span>;
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={approve}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold disabled:opacity-50"
      >
        <Check size={14} /> موافقة
      </button>
      <button
        onClick={reject}
        disabled={pending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold disabled:opacity-50"
      >
        <X size={14} /> رفض
      </button>
    </div>
  );
}
