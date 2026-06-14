'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Download, Share, PlusSquare } from 'lucide-react';
import { useLocale } from './LocaleProvider';

/** حدث beforeinstallprompt (غير معرَّف رسمياً في TS). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'lsm_install_prompt_dismissed_at';
// لا نزعج المستخدم مرّة أخرى قبل مرور 14 يوماً بعد الرفض.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/**
 * InstallPrompt — يسأل المستخدم عند أول فتح للموقع إن كان يحبّ تثبيت
 * التطبيق (PWA).
 *
 *  • على أندرويد/كروم: يلتقط beforeinstallprompt ويعرض نافذة لطيفة، فإن وافق
 *    المستخدم استدعينا منطق التثبيت الأصلي للمتصفح.
 *  • على iOS (لا يدعم beforeinstallprompt): نعرض تعليمات "أضف إلى الشاشة
 *    الرئيسية" يدوياً.
 *  • إذا كان التطبيق مثبَّتاً (standalone) لا نعرض شيئاً.
 *  • نتذكّر رفض المستخدم في localStorage فلا نزعجه كل مرّة.
 */
export default function InstallPrompt() {
  const { locale } = useLocale();
  const ar = locale === 'ar';

  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // مثبَّت بالفعل

    // لا نُظهر إن رفض المستخدم مؤخراً.
    try {
      const last = +(localStorage.getItem(DISMISS_KEY) || 0);
      if (last && Date.now() - last < SNOOZE_MS) return;
    } catch {
      /* ignore */
    }

    // أندرويد/كروم — التقاط حدث التثبيت.
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setIosMode(false);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);

    // إخفاء النافذة عند نجاح التثبيت.
    const onInstalled = () => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS لا يطلق beforeinstallprompt — نعرض التعليمات اليدوية بعد لحظة.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setIosMode(true);
        setVisible(true);
      }, 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const remember = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const close = () => {
    setVisible(false);
    remember();
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
    remember();
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade-in"
      role="dialog"
      aria-modal="false"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-luxor-gold/40 bg-white shadow-2xl ring-1 ring-black/5 p-4">
        <button
          type="button"
          onClick={close}
          aria-label={ar ? 'إغلاق' : 'Close'}
          className="absolute top-2.5 end-2.5 rounded-full p-1.5 text-luxor-navy/40 hover:bg-luxor-gold/10 hover:text-luxor-navy transition"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-luxor-gold/40 shadow">
            <Image src="/icons/icon-192.png" alt="Luxor Smart Mall" fill sizes="56px" className="object-cover" />
          </div>
          <div className="flex-1 min-w-0 pe-5">
            <h3 className="font-bold text-luxor-obsidian leading-tight">
              {ar ? 'تحب تثبّت تطبيق الأقصر سمارت مول؟' : 'Install Luxor Smart Mall?'}
            </h3>
            <p className="mt-1 text-sm text-luxor-navy/70 leading-relaxed">
              {ar
                ? 'ثبّت البرنامج على شاشتك الرئيسية للوصول السريع وتجربة أفضل بدون متصفح.'
                : 'Add the app to your home screen for faster access and a better, browser-free experience.'}
            </p>
          </div>
        </div>

        {iosMode ? (
          <div className="mt-3 rounded-2xl bg-luxor-sandlight/60 p-3 text-sm text-luxor-navy/80">
            <p className="mb-2 font-semibold">
              {ar ? 'للتثبيت على آيفون/آيباد:' : 'To install on iPhone/iPad:'}
            </p>
            <ol className="space-y-1.5">
              <li className="flex items-center gap-2">
                <Share size={16} className="text-luxor-darkgold shrink-0" />
                {ar ? 'اضغط زر المشاركة في المتصفح' : 'Tap the Share button in the browser'}
              </li>
              <li className="flex items-center gap-2">
                <PlusSquare size={16} className="text-luxor-darkgold shrink-0" />
                {ar ? 'اختر «إضافة إلى الشاشة الرئيسية»' : 'Choose “Add to Home Screen”'}
              </li>
            </ol>
            <button
              type="button"
              onClick={close}
              className="mt-3 w-full rounded-xl border-2 border-luxor-gold/50 bg-white py-2.5 font-bold text-luxor-darkgold hover:bg-luxor-gold/10 transition"
            >
              {ar ? 'تمام، فهمت' : 'Got it'}
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-xl border-2 border-luxor-gold/40 bg-white py-2.5 font-bold text-luxor-navy/70 hover:bg-luxor-gold/10 transition"
            >
              {ar ? 'ليس الآن' : 'Not now'}
            </button>
            <button
              type="button"
              onClick={install}
              className="flex-[1.4] inline-flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 font-bold text-luxor-obsidian shadow-luxor hover:opacity-95 transition"
            >
              <Download size={18} />
              {ar ? 'تثبيت التطبيق' : 'Install app'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
