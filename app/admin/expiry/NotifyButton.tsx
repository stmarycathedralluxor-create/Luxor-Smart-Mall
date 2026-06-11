'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buildWhatsAppLink } from '@/lib/utils';
import type { ExpiringStore } from './page';

function buildMessage(row: ExpiringStore): string {
  const expiryDate = new Date(row.expires_at).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const greeting = `مرحباً ${row.owner_name || ''} 🌟\nرسالة من إدارة لوكسور سمارت مول بخصوص متجركم «${row.store_name}».`;

  switch (row.kind) {
    case 'reminder_3d':
      return `${greeting}\n\n⏳ تنبيه: تبقّى *3 أيام* على انتهاء فترة تفعيل متجركم (ينتهي يوم ${expiryDate}).\n\nللاستمرار في عرض متجركم ومنتجاتكم على المنصة، يُرجى التواصل معنا لتجديد التفعيل قبل انتهاء المدة.\n\nشكراً لثقتكم بنا 🙏\nإدارة لوكسور سمارت مول`;
    case 'reminder_1d':
      return `${greeting}\n\n⚠️ تنبيه أخير: تبقّى *يوم واحد فقط* على انتهاء فترة تفعيل متجركم (ينتهي يوم ${expiryDate}).\n\nسارعوا بالتجديد لتجنّب إيقاف المتجر وإخفاء منتجاتكم من المنصة.\n\nنحن في انتظاركم 🙏\nإدارة لوكسور سمارت مول`;
    case 'closure':
      return `${greeting}\n\n🔒 نأسف لإبلاغكم بأن فترة تفعيل متجركم قد *انتهت* بتاريخ ${expiryDate}، وتم إيقاف المتجر مؤقتاً وإخفاؤه من المنصة.\n\nيمكنكم إعادة تفعيل المتجر في أي وقت بالتواصل مع الإدارة لتجديد الاشتراك، وستعود جميع منتجاتكم للظهور فوراً.\n\nنتطلّع لعودتكم قريباً 🌟\nإدارة لوكسور سمارت مول`;
  }
}

export default function NotifyButton({ row }: { row: ExpiringStore }) {
  const router = useRouter();
  const supabase = createClient();
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = () => {
    // 1) open WhatsApp with the prepared message
    const link = buildWhatsAppLink(row.whatsapp, buildMessage(row));
    window.open(link, '_blank', 'noopener,noreferrer');

    // 2) log it (closure also deactivates the store server-side)
    startTransition(async () => {
      const { error } = await supabase.rpc('log_expiry_notification', {
        p_store_id: row.store_id,
        p_kind: row.kind,
      });
      if (error) {
        alert(error.message);
        return;
      }
      setSent(true);
      router.refresh();
    });
  };

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 text-xs font-bold">
        <Check size={14} /> تم الإرسال
      </span>
    );
  }

  return (
    <button
      onClick={send}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
        row.kind === 'closure'
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-[#25D366] text-white hover:bg-[#1ebe57]'
      }`}
      title="فتح واتساب برسالة جاهزة وتسجيل الإرسال"
    >
      <Send size={13} />
      {row.kind === 'closure' ? 'إرسال رسالة الإغلاق + إيقاف' : 'إرسال التذكير'}
    </button>
  );
}
