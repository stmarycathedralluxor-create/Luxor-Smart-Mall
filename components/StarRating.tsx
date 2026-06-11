'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

/**
 * StarRating — display-only or interactive 5-star widget.
 */
export default function StarRating({
  value,
  onChange,
  size = 18,
  showValue = false,
  count,
  className = '',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  showValue?: boolean;
  count?: number;
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const interactive = !!onChange;
  const display = hover || value;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`} dir="ltr">
      <div className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fillPct = Math.min(1, Math.max(0, display - (i - 1))); // 0..1
          return (
            <button
              key={i}
              type="button"
              disabled={!interactive}
              onClick={() => onChange?.(i)}
              onMouseEnter={() => interactive && setHover(i)}
              onMouseLeave={() => interactive && setHover(0)}
              className={`relative ${interactive ? 'cursor-pointer hover:scale-125 transition-transform' : 'cursor-default'}`}
              aria-label={`${i} stars`}
            >
              {/* base (empty) star */}
              <Star size={size} className="text-luxor-sand fill-luxor-sand/40" />
              {/* filled overlay clipped to the fraction */}
              {fillPct > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPct * 100}%` }}
                >
                  <Star size={size} className="text-luxor-gold fill-luxor-gold" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-bold text-luxor-navy">{Number(value).toFixed(1)}</span>
      )}
      {typeof count === 'number' && (
        <span className="text-xs text-luxor-navy/50">({count})</span>
      )}
    </div>
  );
}
