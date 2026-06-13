import { BadgeCheck } from 'lucide-react';
import CroppedImage from './CroppedImage';
import type { ImageCrop } from '@/lib/types';

/**
 * Store profile picture with:
 *  – a thin 2px white inner frame
 *  – a golden "metal" outer frame
 *  – an optional admin-granted verified badge
 *  – بيانات القص (crop) تُطبّق بـ CSS — لا صورة مقصوصة منفصلة مخزّنة
 */
export default function StoreLogoFrame({
  logoUrl,
  logoCrop = null,
  name,
  isVerified = false,
  sizeClass = 'w-20 h-20',
  fallbackTextClass = 'text-3xl',
  badgeSize = 12,
  sizes = '80px',
  priority = false,
}: {
  logoUrl: string | null;
  logoCrop?: ImageCrop | null;
  name: string;
  isVerified?: boolean;
  sizeClass?: string;
  fallbackTextClass?: string;
  badgeSize?: number;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className="relative">
      {/* Golden metal outer frame */}
      <div className="bg-gold-metal p-[3px] rounded-xl shadow-luxor">
        {/* Thin 2px white frame */}
        <div className="bg-white p-[2px] rounded-[9px]">
          <div className={`relative ${sizeClass} rounded-lg overflow-hidden bg-white`}>
            {logoUrl ? (
              <CroppedImage
                src={logoUrl}
                crop={logoCrop}
                alt={name}
                sizes={sizes}
                priority={priority}
              />
            ) : (
              <div
                className={`w-full h-full bg-gradient-to-br from-luxor-goldlight via-luxor-gold to-luxor-darkgold flex items-center justify-center font-black text-luxor-obsidian ${fallbackTextClass}`}
              >
                {name.charAt(0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verified badge — only shown when the admin granted it */}
      {isVerified && (
        <div
          className="absolute -bottom-1.5 -end-1.5 z-30 bg-gradient-to-br from-luxor-goldlight via-luxor-gold to-luxor-darkgold text-luxor-obsidian rounded-full p-1 shadow-lg ring-2 ring-white"
          title="متجر موثّق من الإدارة"
        >
          <BadgeCheck size={badgeSize} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}
