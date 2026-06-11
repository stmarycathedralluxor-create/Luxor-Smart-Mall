'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeStorageUrls } from '@/lib/storage';

export default function DeleteProductButton({ productId }: { productId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setLoading(true);

    // 1) Grab the image URLs BEFORE deleting the row so we can free storage
    const { data: prod } = await supabase
      .from('products')
      .select('images')
      .eq('id', productId)
      .maybeSingle();

    // 2) Delete the row and VERIFY it was actually deleted (RLS can
    //    silently match 0 rows, which made items "come back" later)
    const { data: deleted, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .select('id');

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }
    if (!deleted || deleted.length === 0) {
      setLoading(false);
      alert('تعذر حذف المنتج — لا تملك الصلاحية أو تم حذفه مسبقاً. حدّث الصفحة.');
      router.refresh();
      return;
    }

    // 3) Physically remove the image files from Supabase Storage
    if (prod?.images?.length) {
      await removeStorageUrls(supabase, prod.images);
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
