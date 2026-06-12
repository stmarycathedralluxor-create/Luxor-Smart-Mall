// =============================================================
// GET /api/storage/proxy?url=<public image url>
// Fetches a remote image server-side and re-serves it SAME-ORIGIN
// so the canvas-based ImageEditor can read its pixels without CORS
// errors (R2 public buckets don't send Access-Control-Allow-Origin,
// which made "تعديل صورة موجودة" hang on جاري التحميل forever).
//
// SSRF-safe: only OUR storage hosts are allowed (R2 public base,
// *.r2.dev and the legacy Supabase project storage).
// =============================================================
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAllowedHost(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:') return false;
  // Cloudflare R2 public bucket (configured base or any r2.dev subdomain)
  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (r2Base) {
    try {
      if (host === new URL(r2Base).hostname.toLowerCase()) return true;
    } catch {
      /* malformed env — fall through */
    }
  }
  if (host.endsWith('.r2.dev')) return true;
  // Legacy Supabase storage
  if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (!isAllowedHost(target)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      // Images are immutable (unique filenames) → let fetch cache freely
      cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: 'fetch failed' }, { status: 502 });
    }
    const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'not an image' }, { status: 415 });
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // unique immutable filenames → cache aggressively
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'proxy error' }, { status: 502 });
  }
}
