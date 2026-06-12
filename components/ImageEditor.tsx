'use client';

/**
 * ImageEditor — a real-time crop / zoom / reposition modal.
 *
 * The user sees a live preview frame (with the exact aspect ratio used on the
 * public site), drags the image to reposition it, zooms with a slider /
 * mouse-wheel / pinch gesture, and everything updates in real time.
 * On save, the visible frame is rendered to a canvas and returned as a Blob.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, RefreshCw } from 'lucide-react';

export type ImageEditorProps = {
  /** Object URL or remote URL of the image being edited */
  src: string;
  /** Frame aspect ratio, e.g. 1 (square), 16/6 (cover) */
  aspect: number;
  /** Modal title */
  title: string;
  /** Output size of the longest edge in px */
  outputWidth?: number;
  /** @deprecated output format is now chosen automatically (WebP with JPEG fallback) */
  outputType?: string;
  /** Rounded preview (avatar/logo feel) */
  round?: boolean;
  /**
   * Also export the FULL original image (uncropped, only compressed &
   * capped at 2000px) so the public lightbox can show it complete.
   */
  captureOriginal?: boolean;
  onCancel: () => void;
  onSave: (blob: Blob, originalBlob?: Blob | null) => void | Promise<void>;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/**
 * Resolve the URL the editor should actually load.
 * Local object/data URLs load directly. Remote URLs (R2 / Supabase) are
 * routed through our same-origin proxy because the public buckets don't
 * send CORS headers — loading them with crossOrigin='anonymous' fails
 * silently and the editor used to hang on "جاري التحميل" forever.
 */
function resolveEditorSrc(src: string): string {
  if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('/')) return src;
  try {
    const u = new URL(src);
    if (typeof window !== 'undefined' && u.origin === window.location.origin) return src;
    return `/api/storage/proxy?url=${encodeURIComponent(src)}`;
  } catch {
    return src;
  }
}

/**
 * Compress the canvas as aggressively as possible without visibly ruining
 * the image. Tries WebP first (much smaller), falls back to JPEG on old
 * Safari. Steps quality down until the target size is reached.
 */
async function compressCanvas(canvas: HTMLCanvasElement, targetBytes = 220 * 1024): Promise<Blob> {
  const encode = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
  const probe = await encode('image/webp', 0.8);
  const useWebp = !!probe && probe.type === 'image/webp';
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const qualities = [0.82, 0.74, 0.66, 0.6];
  let best: Blob | null = null;
  for (const q of qualities) {
    const blob = await encode(type, q);
    if (!blob) continue;
    best = blob;
    if (blob.size <= targetBytes) break;
  }
  if (!best) {
    const fallback = await encode('image/jpeg', 0.85);
    if (!fallback) throw new Error('export failed');
    return fallback;
  }
  return best;
}

export default function ImageEditor({
  src,
  aspect,
  title,
  outputWidth = 1200,
  round = false,
  captureOriginal = false,
  onCancel,
  onSave,
}: ImageEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(() => resolveEditorSrc(src));
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0 | 90 | 180 | 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  // pointer state (supports mouse drag + touch drag + pinch zoom)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gesture = useRef<{
    startOffset: { x: number; y: number };
    startZoom: number;
    startDist: number;
    startCenter: { x: number; y: number };
  } | null>(null);

  // Load the image (CORS-safe so canvas export works for remote URLs)
  // IMPORTANT: when the editor is reused for the NEXT image in a multi-image
  // queue (the `src` prop changes without unmounting), every piece of state
  // must be reset — otherwise `saving` stays true and the editor hangs on
  // "جاري الحفظ..." forever, blocking the rest of the queue.
  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
    setSaving(false);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
    pointers.current.clear();
    gesture.current = null;

    let cancelled = false;
    const primary = resolveEditorSrc(src);
    setDisplaySrc(primary);

    const tryLoad = (url: string, fallback?: string) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        imgRef.current = img;
        setDisplaySrc(url);
        setLoaded(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        if (fallback) {
          // proxy failed (e.g. route not deployed yet) → try the direct URL
          tryLoad(fallback);
        } else {
          setLoadError(true);
        }
      };
      img.src = url;
    };

    tryLoad(primary, primary !== src ? src : undefined);

    return () => {
      cancelled = true;
      imgRef.current = null;
    };
  }, [src]);

  // Measure frame
  useEffect(() => {
    const measure = () => {
      if (frameRef.current) {
        const r = frameRef.current.getBoundingClientRect();
        setFrameSize({ w: r.width, h: r.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [loaded]);

  /** natural dimensions taking rotation into account */
  const getDims = useCallback(() => {
    const img = imgRef.current;
    if (!img) return { w: 1, h: 1 };
    const swap = rotation % 180 !== 0;
    return { w: swap ? img.naturalHeight : img.naturalWidth, h: swap ? img.naturalWidth : img.naturalHeight };
  }, [rotation]);

  /** scale so the image covers the frame at zoom=1 */
  const getBaseScale = useCallback(() => {
    const { w, h } = getDims();
    if (!frameSize.w || !frameSize.h) return 1;
    return Math.max(frameSize.w / w, frameSize.h / h);
  }, [getDims, frameSize]);

  /** keep the image covering the frame — clamp the pan offset */
  const clampOffset = useCallback(
    (o: { x: number; y: number }, z: number) => {
      const { w, h } = getDims();
      const s = getBaseScale() * z;
      const maxX = Math.max(0, (w * s - frameSize.w) / 2);
      const maxY = Math.max(0, (h * s - frameSize.h) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, o.x)),
        y: Math.min(maxY, Math.max(-maxY, o.y)),
      };
    },
    [getDims, getBaseScale, frameSize]
  );

  // re-clamp when zoom changes
  useEffect(() => {
    setOffset((o) => clampOffset(o, zoom));
  }, [zoom, clampOffset]);

  const setZoomClamped = (z: number) => setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)));

  // ───────────── pointer handlers (drag + pinch) ─────────────
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    if (pts.length === 1) {
      gesture.current = {
        startOffset: { ...offset },
        startZoom: zoom,
        startDist: 0,
        startCenter: { x: pts[0].x, y: pts[0].y },
      };
    } else if (pts.length === 2) {
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      gesture.current = {
        startOffset: { ...offset },
        startZoom: zoom,
        startDist: Math.hypot(dx, dy),
        startCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointers.current.values());
    const g = gesture.current;

    if (pts.length === 1) {
      const dx = pts[0].x - g.startCenter.x;
      const dy = pts[0].y - g.startCenter.y;
      setOffset(clampOffset({ x: g.startOffset.x + dx, y: g.startOffset.y + dy }, zoom));
    } else if (pts.length >= 2 && g.startDist > 0) {
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy);
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, g.startZoom * (dist / g.startDist)));
      setZoom(newZoom);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      setOffset(clampOffset({ x: g.startOffset.x + (cx - g.startCenter.x), y: g.startOffset.y + (cy - g.startCenter.y) }, newZoom));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    else {
      // restart gesture with remaining pointer
      const pts = Array.from(pointers.current.values());
      gesture.current = {
        startOffset: { ...offset },
        startZoom: zoom,
        startDist: 0,
        startCenter: { x: pts[0].x, y: pts[0].y },
      };
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoomClamped(zoom + (e.deltaY < 0 ? 0.12 : -0.12));
  };

  const rotate = () => {
    setRotation((r) => (r + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  const reset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // ───────────── export the visible frame to a Blob ─────────────
  const handleSave = async () => {
    const img = imgRef.current;
    if (!img || !frameSize.w || !frameSize.h) return;
    setSaving(true);
    try {
      const { w: dw, h: dh } = getDims();
      const s = getBaseScale() * zoom;
      // top-left of the (rotated) image inside the frame
      const left = frameSize.w / 2 - (dw * s) / 2 + offset.x;
      const top = frameSize.h / 2 - (dh * s) / 2 + offset.y;
      // visible source rect in rotated-image coordinates
      const sx = -left / s;
      const sy = -top / s;
      const sw = frameSize.w / s;
      const sh = frameSize.h / s;

      const outW = Math.round(outputWidth);
      const outH = Math.round(outputWidth / aspect);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingQuality = 'high';

      // White background (transparent sources flatten cleanly into WebP/JPEG)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      // map output frame → rotated-image space → original image space
      ctx.save();
      const scaleX = outW / sw;
      const scaleY = outH / sh;
      ctx.scale(scaleX, scaleY);
      ctx.translate(-sx, -sy);
      // draw the original image rotated around the rotated-canvas center
      ctx.translate(dw / 2, dh / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      const blob = await compressCanvas(canvas);

      // ── Optional: export the COMPLETE original (rotation applied, no crop) ──
      let originalBlob: Blob | null = null;
      if (captureOriginal) {
        try {
          const MAX_EDGE = 2000;
          const scale = Math.min(1, MAX_EDGE / Math.max(dw, dh));
          const fw = Math.max(1, Math.round(dw * scale));
          const fh = Math.max(1, Math.round(dh * scale));
          const full = document.createElement('canvas');
          full.width = fw;
          full.height = fh;
          const fctx = full.getContext('2d')!;
          fctx.imageSmoothingQuality = 'high';
          fctx.fillStyle = '#ffffff';
          fctx.fillRect(0, 0, fw, fh);
          fctx.translate(fw / 2, fh / 2);
          fctx.rotate((rotation * Math.PI) / 180);
          fctx.drawImage(
            img,
            (-img.naturalWidth * scale) / 2,
            (-img.naturalHeight * scale) / 2,
            img.naturalWidth * scale,
            img.naturalHeight * scale
          );
          originalBlob = await compressCanvas(full, 480 * 1024);
        } catch {
          originalBlob = null; // best-effort — never block the crop save
        }
      }

      await onSave(blob, originalBlob);
    } catch (err) {
      console.error(err);
    } finally {
      // Always release the button — if the editor moves on to the next
      // queued image (same component instance) it must be usable again.
      setSaving(false);
    }
  };

  const { w: dw, h: dh } = getDims();
  const s = getBaseScale() * zoom;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-luxor-gold/20">
          <h3 className="font-bold text-luxor-navy flex items-center gap-2">
            <Move size={18} className="text-luxor-gold" />
            {title}
          </h3>
          <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-luxor-sandlight text-luxor-navy/60">
            <X size={18} />
          </button>
        </div>

        {/* Live preview frame */}
        <div className="p-5">
          <p className="text-xs text-luxor-navy/60 mb-3 text-center">
            اسحب الصورة لتغيير موضعها • استخدم العجلة أو الشريط للتكبير • قرّب بإصبعين على الموبايل
          </p>
          <div className="flex justify-center">
            <div
              ref={frameRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
              className={`relative overflow-hidden bg-luxor-sandlight cursor-grab active:cursor-grabbing select-none ring-2 ring-luxor-gold shadow-inner ${
                round ? 'rounded-3xl' : 'rounded-xl'
              }`}
              style={{
                width: '100%',
                maxWidth: aspect >= 2 ? 560 : 360,
                aspectRatio: String(aspect),
                touchAction: 'none',
              }}
            >
              {loaded && frameSize.w > 0 && imgRef.current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displaySrc}
                  alt="editing"
                  draggable={false}
                  className="absolute pointer-events-none max-w-none"
                  style={{
                    // element keeps the ORIGINAL orientation; rotation happens
                    // around its center, so the rotated bounding box (dw×dh)
                    // stays centered at the same point.
                    width: imgRef.current.naturalWidth * s,
                    height: imgRef.current.naturalHeight * s,
                    left: frameSize.w / 2 - (imgRef.current.naturalWidth * s) / 2 + offset.x,
                    top: frameSize.h / 2 - (imgRef.current.naturalHeight * s) / 2 + offset.y,
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              )}
              {!loaded && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center text-luxor-navy/40 text-sm">جاري التحميل...</div>
              )}
              {loadError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4">
                  <span className="text-red-500 text-sm font-semibold">تعذر تحميل الصورة</span>
                  <span className="text-luxor-navy/50 text-xs">تحقق من اتصالك بالإنترنت ثم أعد المحاولة</span>
                </div>
              )}
              {/* rule-of-thirds grid */}
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/70" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/70" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/70" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/70" />
              </div>
            </div>
          </div>

          {/* Zoom slider + actions */}
          <div className="mt-5 flex items-center gap-3 max-w-md mx-auto">
            <button type="button" onClick={() => setZoomClamped(zoom - 0.25)} className="p-2 rounded-full bg-luxor-sandlight hover:bg-luxor-gold/20 text-luxor-navy">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoomClamped(parseFloat(e.target.value))}
              className="flex-1 accent-luxor-gold"
            />
            <button type="button" onClick={() => setZoomClamped(zoom + 0.25)} className="p-2 rounded-full bg-luxor-sandlight hover:bg-luxor-gold/20 text-luxor-navy">
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={rotate} title="تدوير" className="p-2 rounded-full bg-luxor-sandlight hover:bg-luxor-gold/20 text-luxor-navy">
              <RotateCw size={16} />
            </button>
            <button type="button" onClick={reset} title="إعادة ضبط" className="p-2 rounded-full bg-luxor-sandlight hover:bg-luxor-gold/20 text-luxor-navy">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 bg-luxor-sandlight/50 border-t border-luxor-gold/20">
          <button type="button" onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-luxor-sand text-luxor-navy/70 font-semibold text-sm hover:bg-white transition">
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !loaded}
            className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-50"
          >
            <Check size={16} />
            {saving ? 'جاري الحفظ...' : 'تطبيق وحفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}
