'use client';

import { Phone } from 'lucide-react';

/**
 * PhoneInput — حقل رقم هاتف مصري بمقدّمة +2 مثبّتة.
 *
 * المقدّمة "+2" تظهر بشكل ثابت داخل الحقل ولا يمكن للبائع تعديلها أو حذفها،
 * ويبدأ هو في الكتابة بعدها مباشرةً من 0 (مثال: 01012345678).
 *
 * القيمة المُخزَّنة دائماً بصيغة: "+2" + الأرقام (مثال: "+201012345678").
 * نتعامل مع القيم القديمة المخزّنة بأي صيغة (تبدأ بـ +20 أو 0020 أو 20…)
 * بتطبيعها تلقائياً عند العرض.
 */

/** يحوّل أي قيمة مخزّنة إلى الأرقام التي تلي المقدّمة +2 فقط */
export function localDigits(value: string): string {
  let d = (value || '').replace(/[^\d]/g, '');
  // أزل بادئة الدولة بكل صورها الممكنة: 0020 / 20
  if (d.startsWith('0020')) d = d.slice(4);
  else if (d.startsWith('20')) d = d.slice(2);
  return d;
}

/** القيمة الكاملة للتخزين/واتساب: +2 + الأرقام المحلية */
export function fullPhone(localPart: string): string {
  const d = (localPart || '').replace(/[^\d]/g, '');
  return d ? `+2${d}` : '';
}

export default function PhoneInput({
  value,
  onChange,
  required = false,
  id,
  className = '',
  withIcon = false,
  placeholder = '01xxxxxxxxx',
}: {
  /** القيمة الكاملة المخزَّنة (تبدأ بـ +2 عادةً) */
  value: string;
  /** يُستدعى بالقيمة الكاملة الجديدة (+2 + الأرقام) */
  onChange: (full: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
  /** عرض أيقونة الهاتف داخل الحقل (يُستخدم في صفحة التسجيل) */
  withIcon?: boolean;
  placeholder?: string;
}) {
  const local = localDigits(value);

  return (
    <div className={`flex items-stretch ${className}`} dir="ltr">
      {/* مقدّمة ثابتة +2 */}
      <span className="inline-flex items-center gap-1 px-3 bg-luxor-sandlight border border-luxor-sand border-e-0 rounded-s-xl text-sm font-bold text-luxor-navy/70 select-none shrink-0">
        {withIcon && <Phone size={15} className="text-luxor-navy/40" />}
        +2
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        required={required}
        value={local}
        onChange={(e) => onChange(fullPhone(e.target.value))}
        className="input-field rounded-s-none flex-1 ltr:text-left"
        placeholder={placeholder}
      />
    </div>
  );
}
