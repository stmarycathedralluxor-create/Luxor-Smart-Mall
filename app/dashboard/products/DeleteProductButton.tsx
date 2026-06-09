'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DeleteProductButton({ productId }: { productId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    setLoading(true);
    const { error } = await supabase.from('products').delete().eq('id', productId);
    setLoading(false);
    if (error) {
      alert(error.message);
      return;
    }
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
