'use client';

import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';

/**
 * PhoneInput — حقل رقم هاتف مصري بمقدّمة ثابتة "+2" ظاهرة، والمستخدم
 * يكتب رقمه كاملاً مبدوءاً بالصفر (مثال: 01012345678).
 *
 * القيمة المخزَّنة = "+2" + الرقم المكتوب بالصفر، أي مثلاً:
 *   +2  و 01012345678  →  +201012345678
 * وهي بالمصادفة نفس الصيغة الدولية الصحيحة لمصر (كود 20 ثم 1012345678)،
 * لذا تعمل مباشرةً مع روابط wa.me (التي تحذف الرموز غير الرقمية فتصبح
 * 201012345678).
 *
 * نحافظ على الصفر الأول دائماً (الأرقام القديمة لم يعد يختفي صفرها).
 */

const PREFIX = '+2'; // المقدّمة الثابتة الظاهرة كما يريدها المستخدم

/**
 * يحوّل أي قيمة مخزّنة (أو مُدخلة) إلى الرقم المحلي المعروض بصيغة
 * مبدوءة بصفر (0XXXXXXXXXX). نزيل المقدّمة "+2" / كود الدولة بكل صوره
 * ثم نضمن وجود صفر بادئ واحد.
 */
export function localDigits(value: string): string {
  let d = (value || '').replace(/[^\d]/g, '');
  if (!d) return '';
  // أزل بادئة الخروج الدولية 00 إن وُجدت
  if (d.startsWith('00')) d = d.slice(2);
  // أزل كود الدولة 20 إن وُجد (الصيغة المخزَّنة +20XXXXXXXXXX)
  if (d.startsWith('20')) {
    d = d.slice(2);
  } else if (d.startsWith('2') && d.length > 10) {
    // صيغة قديمة محتملة "+2" + رقم محلي بصفره (2 + 0XXXXXXXXXX)
    d = d.slice(1);
  }
  // احذف أي أصفار بادئة زائدة ثم أعِد صفراً واحداً (الصيغة المحلية المصرية)
  d = d.replace(/^0+/, '');
  return d ? `0${d}` : '';
}

/**
 * القيمة الكاملة للتخزين/واتساب: "+2" + الرقم المحلي كاملاً بصفره.
 * (مثال: +2 + 01012345678 → +201012345678)
 */
export function fullPhone(localPart: string): string {
  const local = localDigits(localPart);
  return local ? `${PREFIX}${local}` : '';
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
  /** يُستدعى بالقيمة الكاملة الجديدة (+2 + الرقم المحلي بصفره) */
  onChange: (full: string) => void;
  required?: boolean;
  id?: string;
  className?: string;
  /** عرض أيقونة الهاتف داخل الحقل (يُستخدم في صفحة التسجيل) */
  withIcon?: boolean;
  placeholder?: string;
}) {
  // حالة العرض المحلية — تسمح بالكتابة الطبيعية المبدوءة بـ 0 رقماً رقماً
  // (لا نشتقّها مباشرة من value في كل كتابة حتى لا يختفي الصفر أثناء الكتابة).
  const [display, setDisplay] = useState<string>(() => localDigits(value));

  // إذا تغيّرت القيمة الخارجية (تحميل بيانات قديمة مثلاً) وكانت تختلف فعلياً
  // عن المعروض حالياً، زامِن العرض معها مرة واحدة.
  useEffect(() => {
    const fromValue = localDigits(value);
    if (fullPhone(display) !== (value || '') && fromValue !== display) {
      setDisplay(fromValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

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
        value={display}
        onChange={(e) => {
          // نحتفظ بالأرقام فقط ونسمح ببدء الرقم بـ 0 (الصيغة المصرية الطبيعية)
          const typed = e.target.value.replace(/[^\d]/g, '').slice(0, 11);
          setDisplay(typed);
          onChange(fullPhone(typed));
        }}
        onBlur={() => {
          // عند الخروج طبّع العرض إلى صيغة 0XXXXXXXXXX الموحّدة
          setDisplay(localDigits(fullPhone(display)));
        }}
        className="input-field rounded-s-none flex-1 ltr:text-left"
        placeholder={placeholder}
        maxLength={11}
      />
    </div>
  );
}
