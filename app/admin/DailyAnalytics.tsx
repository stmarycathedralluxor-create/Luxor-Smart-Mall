'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Globe, Store as StoreIcon, Tag, ShoppingCart,
  Users, Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { DailyAnalyticsRow } from '@/lib/types';

const RANGES = [
  { value: 7, label: '7 أيام' },
  { value: 14, label: '14 يوم' },
  { value: 30, label: '30 يوم' },
  { value: 90, label: '90 يوم' },
];

/** يوم الأسبوع + التاريخ بصيغة عربية مختصرة. */
function formatDay(iso: string): { weekday: string; date: string; isToday: boolean } {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  const isToday = d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
  const weekday = d.toLocaleDateString('ar-EG', { weekday: 'long' });
  const date = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
  return { weekday, date, isToday };
}

/**
 * DailyAnalytics — جدول تحليلات يومي في لوحة الأدمن.
 * يعرض صفّاً لكل يوم (حتى الأيام بلا نشاط) مع: الزيارات الفريدة، زيارات المتاجر،
 * استعلامات الأسعار، الطلبات، المستخدمين الجدد، والمتاجر الجديدة.
 */
export default function DailyAnalytics() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<DailyAnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (n: number) => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: rpcErr } = await supabase.rpc('get_daily_analytics', { p_days: n });
      if (rpcErr) {
        const msg = rpcErr.message || '';
        if (/function .*get_daily_analytics.* does not exist|could not find the function/i.test(msg)) {
          setError('migration');
        } else {
          setError(msg);
        }
        setRows([]);
      } else {
        setRows((data ?? []) as DailyAnalyticsRow[]);
      }
    } catch (e: any) {
      setError(e?.message || 'تعذّر تحميل التحليلات اليومية');
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  // إجماليات النافذة المعروضة
  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.site_visits += r.site_visits;
        acc.store_visits += r.store_visits;
        acc.price_inquiries += r.price_inquiries;
        acc.orders += r.orders;
        acc.new_users += r.new_users;
        acc.new_stores += r.new_stores;
        return acc;
      },
      { site_visits: 0, store_visits: 0, price_inquiries: 0, orders: 0, new_users: 0, new_stores: 0 }
    );
  }, [rows]);

  const maxVisits = useMemo(
    () => Math.max(1, ...rows.map((r) => r.site_visits)),
    [rows]
  );

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h3 className="font-bold text-luxor-navy flex items-center gap-2">
          <CalendarDays size={18} className="text-luxor-gold" /> التحليلات اليومية
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-xl border border-luxor-navy/15 overflow-hidden">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setDays(r.value)}
                className={`px-3 py-1.5 text-xs font-bold transition ${
                  days === r.value
                    ? 'bg-luxor-gold text-luxor-obsidian'
                    : 'bg-white text-luxor-navy/70 hover:bg-luxor-gold/10'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => load(days)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-luxor-navy/15 text-luxor-navy/70 hover:bg-luxor-gold/10 transition"
            aria-label="تحديث"
            title="تحديث"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error === 'migration' ? (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 text-center">
          <AlertTriangle className="text-amber-600 mx-auto mb-2" size={26} />
          <p className="font-bold text-amber-800 mb-1">التحليلات اليومية تحتاج تفعيلاً لمرّة واحدة</p>
          <p className="text-amber-700/80 text-sm">
            افتح <span className="font-bold">Supabase → SQL Editor</span> وشغّل ملف المايجريشن:
            <code className="block mt-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5 font-mono text-xs text-amber-900">
              supabase/migrations/0016_daily_analytics.sql
            </code>
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="py-12 text-center text-luxor-navy/50">
          <Loader2 className="animate-spin mx-auto mb-2" size={24} /> جارٍ تحميل التحليلات…
        </div>
      ) : (
        <>
          {/* ملخّص الإجماليات */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            <MiniStat icon={Globe} label="زيارات" value={totals.site_visits} />
            <MiniStat icon={StoreIcon} label="متاجر" value={totals.store_visits} />
            <MiniStat icon={Tag} label="أسعار" value={totals.price_inquiries} />
            <MiniStat icon={ShoppingCart} label="طلبات" value={totals.orders} />
            <MiniStat icon={Users} label="مستخدمون" value={totals.new_users} />
            <MiniStat icon={StoreIcon} label="متاجر جديدة" value={totals.new_stores} />
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-luxor-navy/60 text-xs border-b border-luxor-sand">
                  <th className="text-start font-bold py-2 px-2">اليوم</th>
                  <th className="text-center font-bold py-2 px-2">الزيارات</th>
                  <th className="text-center font-bold py-2 px-2">زيارات المتاجر</th>
                  <th className="text-center font-bold py-2 px-2">استعلامات الأسعار</th>
                  <th className="text-center font-bold py-2 px-2">الطلبات</th>
                  <th className="text-center font-bold py-2 px-2">مستخدمون جدد</th>
                  <th className="text-center font-bold py-2 px-2">متاجر جديدة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const { weekday, date, isToday } = formatDay(r.day);
                  const barW = Math.round((r.site_visits / maxVisits) * 100);
                  return (
                    <tr
                      key={r.day}
                      className={`border-b border-luxor-sand/60 ${
                        isToday ? 'bg-luxor-gold/10' : 'hover:bg-luxor-sandlight/50'
                      }`}
                    >
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-luxor-navy whitespace-nowrap">{date}</span>
                          <span className="text-[11px] text-luxor-navy/50 whitespace-nowrap">{weekday}</span>
                          {isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-luxor-gold/20 text-luxor-darkgold font-bold">
                              اليوم
                            </span>
                          )}
                        </div>
                        {/* شريط تمثيل بصري لعدد الزيارات */}
                        <div className="mt-1 h-1 w-full max-w-[160px] rounded-full bg-luxor-navy/10 overflow-hidden">
                          <div className="h-full bg-luxor-gold" style={{ width: `${barW}%` }} />
                        </div>
                      </td>
                      <Cell value={r.site_visits} strong />
                      <Cell value={r.store_visits} />
                      <Cell value={r.price_inquiries} />
                      <Cell value={r.orders} />
                      <Cell value={r.new_users} />
                      <Cell value={r.new_stores} />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-luxor-navy/50 mt-3">
            الزيارات = جلسات فريدة في اليوم. تُعرَض كل الأيام في النطاق المختار حتى الأيام بلا نشاط.
          </p>
        </>
      )}
    </div>
  );
}

function Cell({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <td className="text-center py-2 px-2">
      <span
        className={
          value > 0
            ? strong
              ? 'font-bold text-luxor-navy'
              : 'text-luxor-navy/80'
            : 'text-luxor-navy/25'
        }
      >
        {value.toLocaleString('ar-EG')}
      </span>
    </td>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-luxor-sandlight p-2.5 text-center">
      <Icon size={15} className="mx-auto mb-1 text-luxor-gold" />
      <div className="text-base font-bold text-luxor-navy leading-none">
        {value.toLocaleString('ar-EG')}
      </div>
      <div className="text-[10px] text-luxor-navy/60 mt-0.5">{label}</div>
    </div>
  );
}
