'use client';

import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';

/**
 * PhoneInput — حقل رقم هاتف مصري بمقدّمة +20 مثبّتة (كود مصر الدولي الصحيح).
 *
 * المشكلة القديمة: كانت المقدّمة "+2" فقط وكان يُجمَع معها الرقم المحلي
 * (المبدوء بـ 0). كان كود التطبيع يحذف "20" من أول الأرقام، فعند إعادة
 * عرض رقم مخزَّن مثل "+201012345678" كان يتحوّل إلى "1012345678" — أي
 * يختفي الصفر الأول من الأرقام القديمة. تم إصلاح ذلك بالكامل هنا.
 *
 * المنطق الصحيح:
 *  - كود مصر الدولي = 20 (وليس 2).
 *  - الموبايل المصري محلياً يبدأ بـ 0 (مثال: 01012345678).
 *  - دولياً نحذف الصفر الأول فقط: +20 1012345678 → +201012345678.
 *
 * المستخدم يكتب الرقم بصيغته الطبيعية المبدوءة بـ 0 (01012345678)،
 * والمقدّمة "+20" ثابتة لا يمكن تعديلها. القيمة المُخزَّنة دائماً
 * بالصيغة الدولية القانونية: "+20" + الأرقام بدون الصفر الأول
 * (مثال: "+201012345678") — صالحة مباشرةً لروابط wa.me.
 */

const EG_CC = '20'; // كود مصر الدولي الصحيح

/**
 * يحوّل أي قيمة مخزّنة (أو مُدخلة) إلى الرقم المحلي المعروض بصيغة 0XXXXXXXXXX.
 * نزيل كود الدولة بكل صوره ثم نضمن وجود صفر بادئ واحد فقط.
 */
export function localDigits(value: string): string {
  let d = (value || '').replace(/[^\d]/g, '');
  if (!d) return '';
  // أزل بادئة الخروج الدولية 00 إن وُجدت
  if (d.startsWith('00')) d = d.slice(2);
  // أزل كود الدولة 20 (سواء تبِعه صفر محلي أو رقم محمول مباشرة)
  if (d.startsWith(EG_CC)) {
    d = d.slice(EG_CC.length);
  }
  // احذف أي أصفار بادئة زائدة ثم أعِد صفراً واحداً (الصيغة المحلية المصرية)
  d = d.replace(/^0+/, '');
  return d ? `0${d}` : '';
}

/**
 * القيمة الكاملة للتخزين/واتساب بالصيغة الدولية القانونية:
 * "+20" + الأرقام بدون الصفر الأول (مثال: +201012345678).
 */
export function fullPhone(localPart: string): string {
  // طبّع المُدخل أولاً إلى الصيغة المحلية 0XXXXXXXXXX ثم احذف الصفر الأول
  const local = localDigits(localPart);
  const national = local.replace(/^0+/, '');
  return national ? `+${EG_CC}${national}` : '';
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
  /** القيمة الكاملة المخزَّنة (تبدأ بـ +20 عادةً) */
  value: string;
  /** يُستدعى بالقيمة الكاملة الجديدة (+20 + الأرقام بدون الصفر الأول) */
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
      {/* مقدّمة ثابتة +20 (كود مصر الصحيح) */}
      <span className="inline-flex items-center gap-1 px-3 bg-luxor-sandlight border border-luxor-sand border-e-0 rounded-s-xl text-sm font-bold text-luxor-navy/70 select-none shrink-0">
        {withIcon && <Phone size={15} className="text-luxor-navy/40" />}
        +20
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
