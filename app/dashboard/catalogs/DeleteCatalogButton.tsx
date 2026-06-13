'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeStorageUrls } from '@/lib/storage';

export default function DeleteCatalogButton({ catalogId }: { catalogId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتالوج؟ لن يتم حذف المنتجات نفسها.')) return;
    setLoading(true);

    // 1) احصل على صورة الغلاف قبل الحذف لتحرير التخزين
    const { data: cat } = await supabase
      .from('catalogs')
      .select('cover_image')
      .eq('id', catalogId)
      .maybeSingle();

    // 2) احذف الصف وتحقّق فعلياً من الحذف (RLS قد يطابق 0 صفوف بصمت)
    const { data: deleted, error } = await supabase
      .from('catalogs')
      .delete()
      .eq('id', catalogId)
      .select('id');

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }
    if (!deleted || deleted.length === 0) {
      setLoading(false);
      alert('تعذر حذف الكتالوج — لا تملك الصلاحية أو تم حذفه مسبقاً. حدّث الصفحة.');
      router.refresh();
      return;
    }

    // 3) حرّر صورة الغلاف من التخزين (إن وُجدت)
    if (cat?.cover_image) {
      await removeStorageUrls([cat.cover_image]);
    }

    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-3 py-2 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
      aria-label="delete"
    >
      <Trash2 size={14} />
    </button>
  );
}
