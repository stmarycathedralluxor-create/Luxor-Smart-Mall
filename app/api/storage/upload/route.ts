// =============================================================
// POST /api/storage/upload — upload an image to Cloudflare R2
// Body: multipart/form-data { file, bucket, filename? }
//   bucket   'product-images' | 'store-assets'
//   filename optional base name (e.g. "logo-123.webp"); a safe unique
//            name is generated when omitted
// Auth: Supabase session cookie (must be logged in)
// Quota: checked server-side against user_files + legacy storage
// Returns: { url } public R2 URL
// =============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { r2Upload, r2PublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const APP_BUCKETS = ['product-images', 'store-assets'];
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8MB hard cap per image
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'];

function extFor(type: string): string {
  if (type === 'image/webp') return 'webp';
  if (type === 'image/png') return 'png';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/avif') return 'avif';
  return 'jpg';
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const bucket = String(form.get('bucket') ?? '');
    const requestedName = form.get('filename') ? String(form.get('filename')) : '';

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });
    }
    if (!APP_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'مسار تخزين غير مسموح' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم — الصور فقط' }, { status: 415 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'حجم الصورة أكبر من المسموح (8MB)' }, { status: 413 });
    }

    // ---- Quota enforcement (server-side, can't be bypassed) ----
    try {
      const { data: quota } = await supabase.rpc('get_my_storage_quota');
      if (quota && typeof quota.used_bytes === 'number' && typeof quota.limit_bytes === 'number') {
        if (quota.used_bytes + file.size > quota.limit_bytes) {
          return NextResponse.json(
            { error: 'تجاوزت مساحة التخزين المسموحة. احذف بعض الصور القديمة أو تواصل مع الإدارة لزيادة المساحة.' },
            { status: 413 }
          );
        }
      }
    } catch {
      /* quota RPC missing → allow (no hard limit until migration runs) */
    }

    // ---- Safe object key: {bucket}/{userId}/{name}.{ext} ----
    const safeBase = requestedName
      ? requestedName.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80)
      : '';
    const name =
      safeBase ||
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(file.type)}`;
    const key = `${bucket}/${user.id}/${name}`;

    const buf = Buffer.from(await file.arrayBuffer());
    await r2Upload(key, buf, file.type);

    // ---- Track size for the quota system (best-effort) ----
    try {
      await supabase.from('user_files').upsert(
        { user_id: user.id, path: key, bucket, size_bytes: file.size },
        { onConflict: 'path' }
      );
    } catch {
      /* tracking is best-effort; quota just won't count this file */
    }

    return NextResponse.json({ url: r2PublicUrl(key) });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'فشل رفع الصورة — تأكد من إعدادات R2' },
      { status: 500 }
    );
  }
}
