'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  Trash2,
  Check,
  BadgeCheck,
  CalendarClock,
  Infinity as InfinityIcon,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ExpiryCountdown from '@/components/ExpiryCountdown';
import type { Store } from '@/lib/types';

const PRESETS: { label: string; months: number; days: number }[] = [
  { label: 'شهر', months: 1, days: 0 },
  { label: '3 شهور', months: 3, days: 0 },
  { label: '6 شهور', months: 6, days: 0 },
  { label: 'سنة', months: 12, days: 0 },
];

function addPeriod(months: number, days: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return d;
}

export default function StoreRow({
  store,
  ownerName,
  visitCount = 0,
}: {
  store: Store;
  ownerName: string;
  visitCount?: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [active, setActive] = useState(store.is_active);
  const [approved, setApproved] = useState(store.is_approved ?? false);
  const [verified, setVerified] = useState(store.is_verified ?? false);
  const [expiresAt, setExpiresAt] = useState<string | null>(store.expires_at ?? null);
  const [showPeriod, setShowPeriod] = useState(false);
  const [customMonths, setCustomMonths] = useState('');
  const [customDays, setCustomDays] = useState('');
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

  const toggleVerified = () => {
    startTransition(async () => {
      const newVal = !verified;
      setVerified(newVal);
      const { error } = await supabase
        .from('stores')
        .update({ is_verified: newVal })
        .eq('id', store.id);
      if (error) {
        alert(error.message);
        setVerified(!newVal);
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

  const setPeriod = (months: number, days: number) => {
    startTransition(async () => {
      const newExpiry = addPeriod(months, days).toISOString();
      const { error } = await supabase
        .from('stores')
        .update({
          expires_at: newExpiry,
          activated_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('id', store.id);
      if (error) return alert(error.message);
      setExpiresAt(newExpiry);
      setActive(true);
      setShowPeriod(false);
      router.refresh();
    });
  };

  const setForever = () => {
    startTransition(async () => {
      const { error } = await supabase
        .from('stores')
        .update({ expires_at: null, activated_at: new Date().toISOString() })
        .eq('id', store.id);
      if (error) return alert(error.message);
      setExpiresAt(null);
      setShowPeriod(false);
      router.refresh();
    });
  };

  const applyCustom = () => {
    const m = parseInt(customMonths || '0', 10);
    const d = parseInt(customDays || '0', 10);
    if ((isNaN(m) && isNaN(d)) || m + d <= 0) {
      alert('أدخل عدد شهور و/أو أيام صحيح');
      return;
    }
    setPeriod(isNaN(m) ? 0 : m, isNaN(d) ? 0 : d);
  };

  const remove = async () => {
    if (!confirm(`حذف المتجر "${store.name}" وكل منتجاته نهائياً؟`)) return;
    const { error } = await supabase.from('stores').delete().eq('id', store.id);
    if (error) return alert(error.message);
    router.refresh();
  };

  return (
    <>
      <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
        <td className="p-3 font-medium text-luxor-navy">
          <div className="flex items-center gap-1.5">
            {store.name}
            {verified && <BadgeCheck size={15} className="text-luxor-darkgold shrink-0" />}
          </div>
        </td>
        <td className="p-3 text-luxor-navy/70">{ownerName}</td>
        <td className="p-3 text-luxor-navy/70 ltr:font-mono" dir="ltr">{store.whatsapp}</td>
        <td className="p-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-luxor-navy bg-luxor-gold/15 px-2 py-1 rounded-full">
            👁️ {visitCount.toLocaleString('ar-EG')}
          </span>
        </td>
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
        <td className="p-3">
          <ExpiryCountdown expiresAt={expiresAt} size="sm" />
        </td>
        <td className="p-3">
          <div className="flex gap-1 flex-wrap items-center">
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
            <button
              onClick={toggleVerified}
              disabled={pending}
              className={`p-2 rounded-lg transition ${
                verified
                  ? 'bg-luxor-gold/20 text-luxor-darkgold hover:bg-luxor-gold/30'
                  : 'hover:bg-luxor-gold/10 text-luxor-navy/40'
              }`}
              title={verified ? 'إلغاء التوثيق' : 'منح شارة التوثيق'}
            >
              <BadgeCheck size={14} />
            </button>
            <button
              onClick={() => setShowPeriod((v) => !v)}
              disabled={pending}
              className={`p-2 rounded-lg transition ${
                showPeriod ? 'bg-luxor-navy text-white' : 'hover:bg-luxor-sand/40 text-luxor-navy'
              }`}
              title="مدة التفعيل"
            >
              <CalendarClock size={14} />
            </button>
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
          </div>
        </td>
      </tr>

      {showPeriod && (
        <tr className="border-t border-luxor-gold/20 bg-luxor-sandlight/60">
          <td colSpan={7} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-luxor-navy text-sm flex items-center gap-2">
                <CalendarClock size={16} className="text-luxor-darkgold" />
                مدة تفعيل المتجر «{store.name}» — تبدأ من الآن
              </div>
              <button
                onClick={() => setShowPeriod(false)}
                className="p-1 rounded hover:bg-luxor-sand/60 text-luxor-navy/60"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPeriod(p.months, p.days)}
                  disabled={pending}
                  className="px-3 py-1.5 rounded-lg bg-white border border-luxor-gold/40 hover:bg-luxor-gold hover:text-luxor-obsidian text-luxor-navy text-xs font-bold transition"
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={setForever}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-luxor-navy text-luxor-gold border border-luxor-gold/40 hover:brightness-125 text-xs font-bold inline-flex items-center gap-1.5 transition"
              >
                <InfinityIcon size={13} />
                مفتوح للأبد
              </button>
              <span className="text-luxor-navy/40 text-xs mx-1">أو مدة مخصصة:</span>
              <input
                type="number"
                min={0}
                placeholder="شهور"
                value={customMonths}
                onChange={(e) => setCustomMonths(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-luxor-gold/40 text-xs bg-white"
              />
              <input
                type="number"
                min={0}
                placeholder="أيام"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-luxor-gold/40 text-xs bg-white"
              />
              <button
                onClick={applyCustom}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-gold-gradient text-luxor-obsidian text-xs font-bold hover:brightness-110 transition"
              >
                تطبيق
              </button>
            </div>
            {expiresAt && (
              <div className="mt-3 text-[11px] text-luxor-navy/60">
                تاريخ الانتهاء الحالي:{' '}
                <strong dir="ltr">{new Date(expiresAt).toLocaleString('ar-EG')}</strong>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
