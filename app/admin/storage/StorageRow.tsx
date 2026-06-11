'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, RotateCcw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatBytes } from '@/lib/storage';

export type StorageUsage = {
  user_id: string;
  full_name: string | null;
  store_name: string | null;
  file_count: number;
  total_bytes: number;
  limit_mb: number | null;
};

const DEFAULT_LIMIT_MB = 200;

export default function StorageRow({ usage }: { usage: StorageUsage }) {
  const router = useRouter();
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [limitInput, setLimitInput] = useState(String(usage.limit_mb ?? DEFAULT_LIMIT_MB));
  const [pending, startTransition] = useTransition();

  const effectiveLimitMB = usage.limit_mb ?? DEFAULT_LIMIT_MB;
  const usedBytes = Number(usage.total_bytes ?? 0);
  const limitBytes = effectiveLimitMB * 1024 * 1024;
  const pct = limitBytes > 0 ? Math.min(100, (usedBytes / limitBytes) * 100) : 0;

  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-luxor-gold';

  const saveLimit = (value: number | null) => {
    startTransition(async () => {
      const { error } = await supabase.rpc('set_storage_limit', {
        p_user: usage.user_id,
        p_limit_mb: value,
      });
      if (error) {
        alert(error.message);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const applyLimit = () => {
    const v = parseInt(limitInput, 10);
    if (isNaN(v) || v <= 0) {
      alert('أدخل عدد ميجابايت صحيح أكبر من صفر');
      return;
    }
    saveLimit(v);
  };

  return (
    <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
      <td className="p-3 font-medium text-luxor-navy">{usage.full_name || '—'}</td>
      <td className="p-3 text-luxor-navy/70">{usage.store_name || '—'}</td>
      <td className="p-3 text-luxor-navy/70">{Number(usage.file_count).toLocaleString('ar-EG')}</td>
      <td className="p-3">
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-luxor-navy" dir="ltr">
              {formatBytes(usedBytes)}
            </span>
            <span className="text-luxor-navy/50">{pct.toFixed(0)}%</span>
          </div>
          <div className="h-2 rounded-full bg-luxor-sand/60 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </td>
      <td className="p-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              className="w-20 px-2 py-1 rounded-lg border border-luxor-gold/40 text-xs bg-white"
              dir="ltr"
            />
            <span className="text-[10px] text-luxor-navy/50">MB</span>
          </div>
        ) : (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-full ${
              usage.limit_mb
                ? 'bg-luxor-gold/20 text-luxor-darkgold'
                : 'bg-luxor-sand/50 text-luxor-navy/60'
            }`}
            dir="ltr"
          >
            {effectiveLimitMB} MB{!usage.limit_mb && ' (افتراضي)'}
          </span>
        )}
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          {editing ? (
            <>
              <button
                onClick={applyLimit}
                disabled={pending}
                className="p-2 rounded-lg hover:bg-green-50 text-green-700"
                title="حفظ الحد"
              >
                <Check size={14} />
              </button>
              <button
                onClick={() => saveLimit(null)}
                disabled={pending}
                className="p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy/60"
                title="إعادة للافتراضي (200MB)"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                title="إلغاء"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setLimitInput(String(effectiveLimitMB));
                setEditing(true);
              }}
              className="p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy"
              title="تعديل الحد الأقصى"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
