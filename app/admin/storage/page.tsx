import { createClient } from '@/lib/supabase/server';
import { HardDrive, AlertTriangle } from 'lucide-react';
import StorageRow, { type StorageUsage } from './StorageRow';

export const dynamic = 'force-dynamic';

export default async function AdminStoragePage() {
  const supabase = createClient();

  let usage: StorageUsage[] = [];
  let migrationMissing = false;
  try {
    const { data, error } = await supabase.rpc('get_storage_usage_admin');
    if (error) migrationMissing = true;
    usage = (data as StorageUsage[]) ?? [];
  } catch {
    migrationMissing = true;
  }

  const totalBytes = usage.reduce((s, u) => s + Number(u.total_bytes ?? 0), 0);
  const totalFiles = usage.reduce((s, u) => s + Number(u.file_count ?? 0), 0);
  const totalMB = totalBytes / (1024 * 1024);

  return (
    <div className="space-y-6">
      {migrationMissing && (
        <div className="card p-4 bg-amber-50 border-amber-300 flex items-center gap-3 text-sm text-luxor-navy">
          <AlertTriangle className="text-amber-600 shrink-0" size={20} />
          <div>
            لتفعيل هذه الصفحة شغّل ملف{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200" dir="ltr">
              supabase/migrations/0006_stats_storage.sql
            </code>{' '}
            مرة واحدة في Supabase SQL Editor.
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-luxor-gold/20 flex items-center justify-center text-luxor-gold">
              <HardDrive size={20} />
            </div>
            <span className="text-sm text-luxor-navy/70">إجمالي المساحة المستخدمة</span>
          </div>
          <div className="text-3xl font-bold text-luxor-navy" dir="ltr">
            {totalMB >= 1024 ? (totalMB / 1024).toFixed(2) + ' GB' : totalMB.toFixed(1) + ' MB'}
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-luxor-navy/70 mb-2">عدد الملفات</div>
          <div className="text-3xl font-bold text-luxor-navy">{totalFiles.toLocaleString('ar-EG')}</div>
        </div>
        <div className="card p-5">
          <div className="text-sm text-luxor-navy/70 mb-2">المستخدمون الرافعون للصور</div>
          <div className="text-3xl font-bold text-luxor-navy">
            {usage.filter((u) => Number(u.file_count) > 0).length.toLocaleString('ar-EG')}
          </div>
        </div>
      </div>

      {/* Per-user usage */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-luxor-sand/60 flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-bold text-luxor-navy flex items-center gap-2">
            <HardDrive size={18} className="text-luxor-gold" />
            استهلاك التخزين لكل متجر / مستخدم
          </h2>
          <span className="text-xs text-luxor-navy/60">
            الحد الافتراضي: 200 ميجابايت لكل مستخدم (يمكن تعديله لكل حساب)
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-luxor-sandlight text-luxor-navy">
              <tr>
                <th className="text-start p-3">المستخدم</th>
                <th className="text-start p-3">المتجر</th>
                <th className="text-start p-3">الملفات</th>
                <th className="text-start p-3">المساحة المستخدمة</th>
                <th className="text-start p-3">الحد الأقصى</th>
                <th className="text-start p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {usage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-luxor-navy/50">
                    لا توجد بيانات بعد
                  </td>
                </tr>
              ) : (
                usage.map((u) => <StorageRow key={u.user_id} usage={u} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 text-xs text-luxor-navy/70 leading-relaxed space-y-1">
        <div className="font-bold text-luxor-navy text-sm mb-1">ℹ️ كيف يعمل النظام؟</div>
        <p>• الصور تُضغط تلقائياً قبل الرفع (WebP بجودة عالية) لتقليل المساحة لأقل حد ممكن دون التأثير على الجودة.</p>
        <p>• عند حذف منتج أو متجر أو استبدال صورة، تُحذف الملفات القديمة من التخزين فوراً وتتحرر المساحة.</p>
        <p>• عند تجاوز المستخدم حدّه الأقصى يُمنع من رفع صور جديدة حتى يحذف صوراً قديمة أو ترفع له الحد من هنا.</p>
      </div>
    </div>
  );
}
