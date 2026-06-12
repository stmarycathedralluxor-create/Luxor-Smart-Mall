// =============================================================
// POST /api/storage/remove — delete image files (R2 + legacy Supabase)
// Body (JSON): { urls?: string[], sweepOwnerId?: string }
//   urls         public URLs to delete
//   sweepOwnerId deep-clean ALL files of this owner (ADMIN ONLY)
// Auth: Supabase session cookie.
//   - regular users may only delete THEIR OWN files (key prefix check)
//   - admins may delete anything
// =============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { r2KeyFromUrl } from '@/lib/r2';
import { removeStorageUrlsServer, removeStoreOwnerFilesServer } from '@/lib/storage-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولاً' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls) ? body.urls.filter((u: any) => typeof u === 'string') : [];
    const sweepOwnerId: string | undefined =
      typeof body.sweepOwnerId === 'string' ? body.sweepOwnerId : undefined;

    // Who is asking?
    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const isAdmin = prof?.role === 'admin';

    // ---- Authorization ----
    // R2 keys embed the owner: {bucket}/{userId}/{file}. Non-admins may
    // only delete keys under their own folder. Legacy Supabase URLs are
    // deleted through the user's own session → RLS enforces ownership.
    const allowedUrls = urls.filter((u) => {
      const key = r2KeyFromUrl(u);
      if (!key) return true; // legacy URL → Supabase RLS decides
      if (isAdmin) return true;
      const parts = key.split('/');
      return parts.length >= 3 && parts[1] === user.id;
    });

    if (allowedUrls.length) {
      await removeStorageUrlsServer(supabase, allowedUrls);
    }

    if (sweepOwnerId) {
      // Sweeping a whole folder is allowed for admins, or a user sweeping
      // their own files (e.g. deleting their own store).
      if (!isAdmin && sweepOwnerId !== user.id) {
        return NextResponse.json({ error: 'غير مصرّح' }, { status: 403 });
      }
      await removeStoreOwnerFilesServer(supabase, sweepOwnerId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل حذف الملفات' }, { status: 500 });
  }
}
