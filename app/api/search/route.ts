// =============================================================
// GET /api/search?q=...  — اقتراحات بحث حيّة (live suggestions)
// تُستخدم في القائمة المنسدلة بشريط البحث العلوي. تُعيد عدداً
// محدوداً من المنتجات المطابقة (متجرها مفعّل/معتمد) لعرضها فوراً.
// =============================================================
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isStoreOpen } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const supabase = createClient();
    // بحث عن العنوان أو البراند (غير حسّاس لحالة الأحرف)
    const pattern = `%${q.replace(/[%_]/g, (m) => '\\' + m)}%`;
    const { data, error } = await supabase
      .from('products')
      .select('id, title, brand, price, currency, images, images_meta, store:stores(name, slug, is_active, is_approved, expires_at), category:categories(name_ar)')
      .eq('is_available', true)
      .or(`title.ilike.${pattern},brand.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(24);

    if (error) {
      return NextResponse.json({ results: [], error: error.message }, { status: 200 });
    }

    const results = (data ?? [])
      .filter((p: any) => p.store && isStoreOpen(p.store))
      .slice(0, 8)
      .map((p: any) => ({
        id: p.id,
        title: p.title,
        brand: p.brand ?? null,
        category: p.category?.name_ar ?? null,
        store: p.store?.name ?? null,
        image: Array.isArray(p.images) ? p.images[0] ?? null : null,
        crop: Array.isArray(p.images_meta) ? p.images_meta[0] ?? null : null,
      }));

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e?.message ?? 'search failed' }, { status: 200 });
  }
}
