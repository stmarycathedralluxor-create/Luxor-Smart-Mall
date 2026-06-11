'use client';

import { Infinity as InfinityIcon, TimerReset, AlarmClock, XCircle } from 'lucide-react';
import { getExpiryInfo } from '@/lib/utils';

/**
 * Remaining-days counter for a store activation period.
 * - null expires_at  → "open forever"
 * - expired          → red "closed"
 * - ≤ 3 days         → red countdown
 * - ≤ 7 days         → amber countdown
 * - otherwise        → green countdown
 */
export default function ExpiryCountdown({
  expiresAt,
  size = 'md',
}: {
  expiresAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const info = getExpiryInfo(expiresAt);

  const sizeCls =
    size === 'lg'
      ? 'text-sm px-3.5 py-1.5 gap-1.5'
      : size === 'sm'
        ? 'text-[10px] px-2 py-0.5 gap-1'
        : 'text-xs px-2.5 py-1 gap-1';
  const iconSize = size === 'lg' ? 16 : size === 'sm' ? 11 : 13;

  if (info.openForever) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-bold bg-luxor-gold/15 text-luxor-darkgold border border-luxor-gold/40 ${sizeCls}`}
        title="المتجر مفعّل للأبد"
      >
        <InfinityIcon size={iconSize} />
        مفتوح للأبد
      </span>
    );
  }

  if (info.expired) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-bold bg-red-100 text-red-700 border border-red-200 ${sizeCls}`}
        title={`انتهى التفعيل في ${info.expiresAt!.toLocaleDateString('ar-EG')}`}
      >
        <XCircle size={iconSize} />
        انتهى التفعيل
      </span>
    );
  }

  const d = info.daysLeft!;
  const cls =
    d <= 3
      ? 'bg-red-100 text-red-700 border-red-200'
      : d <= 7
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-green-100 text-green-700 border-green-200';
  const Icon = d <= 7 ? AlarmClock : TimerReset;

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border ${cls} ${sizeCls}`}
      title={`ينتهي التفعيل في ${info.expiresAt!.toLocaleDateString('ar-EG')}`}
    >
      <Icon size={iconSize} />
      {d === 1 ? 'يوم واحد متبقٍ' : d === 2 ? 'يومان متبقيان' : `${d} يوم متبقي`}
    </span>
  );
}
