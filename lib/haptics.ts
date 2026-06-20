'use client';

/**
 * lib/haptics.ts — لمسات اهتزازية خفيفة (Haptic feedback) تجعل تجربة السحب
 * "إدمانية" وحيّة على الهواتف. تستخدم Vibration API المتاحة على أندرويد
 * ومعظم متصفّحات الجوال. على الأجهزة غير المدعومة (مثل iOS Safari) تتجاهل
 * النداء بهدوء دون أي أخطاء.
 *
 * الأنماط مضبوطة لتكون "خفيفة" جداً — مجرّد نقرة شعورية لا إزعاج فيها.
 */

export type HapticPattern = 'tick' | 'soft' | 'medium' | 'snap' | 'success';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tick: 6, // نقرة خفيفة جداً عند تغيّر الشريحة
  soft: 10, // لمسة ناعمة
  medium: 16, // لمسة متوسّطة (فتح/إغلاق)
  snap: [8, 14, 8], // ارتداد خفيف عند بلوغ الحافة
  success: [10, 30, 12], // نبضة نجاح
};

let lastFire = 0;

/** هل يدعم الجهاز الاهتزاز فعلاً؟ */
export function canVibrate(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

/**
 * أطلق اهتزازاً قصيراً. مع throttling بسيط (≈40ms) لتجنّب التكرار المزعج
 * أثناء السحب السريع. آمن تماماً على كل الأجهزة.
 */
export function haptic(pattern: HapticPattern = 'tick'): void {
  if (!canVibrate()) return;
  const now = Date.now();
  if (now - lastFire < 40) return;
  lastFire = now;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* تجاهل بصمت */
  }
}

/**
 * React hook صغير يعيد دالة haptic جاهزة للاستخدام داخل المكوّنات.
 * يحترم تفضيل المستخدم "reduced motion" فيتوقّف عن الاهتزاز إن طُلب ذلك.
 */
export function useHaptics() {
  return (pattern: HapticPattern = 'tick') => {
    if (typeof window !== 'undefined') {
      const reduced = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches;
      if (reduced) return;
    }
    haptic(pattern);
  };
}
