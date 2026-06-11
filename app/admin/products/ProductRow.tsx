'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { removeStorageUrls } from '@/lib/storage';
import { formatPrice } from '@/lib/utils';

export default function ProductRow({ product }: { product: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [available, setAvailable] = useState(product.is_available);
  const [pending, startTransition] = useTransition();

  const toggleAvailable = () => {
    startTransition(async () => {
      const newVal = !available;
      setAvailable(newVal);
      const { error } = await supabase.from('products').update({ is_available: newVal }).eq('id', product.id);
      if (error) {
        alert(error.message);
        setAvailable(!newVal);
        return;
      }
      router.refresh();
    });
  };

  const remove = async () => {
    if (!confirm(`حذف المنتج "${product.title}" نهائياً؟`)) return;

    // Read image URLs first so we can free the storage afterwards
    const { data: prod } = await supabase
      .from('products')
      .select('images')
      .eq('id', product.id)
      .maybeSingle();

    // Delete + verify a row was actually removed (RLS can match 0 rows)
    const { data: deleted, error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .select('id');
    if (error) return alert(error.message);
    if (!deleted || deleted.length === 0) {
      alert('تعذر حذف المنتج — لا تملك الصلاحية أو تم حذفه مسبقاً.');
      router.refresh();
      return;
    }

    // Physically remove image files from Supabase Storage
    if (prod?.images?.length) {
      await removeStorageUrls(supabase, prod.images);
    }

    router.refresh();
  };

  return (
    <tr className="border-t border-luxor-sand/40 hover:bg-luxor-sandlight/40">
      <td className="p-3 font-medium text-luxor-navy max-w-xs truncate">{product.title}</td>
      <td className="p-3 text-luxor-navy/70">{product.store?.name ?? '—'}</td>
      <td className="p-3 text-luxor-gold font-bold">{formatPrice(product.price)}</td>
      <td className="p-3 text-luxor-navy/70">{product.views}</td>
      <td className="p-3">
        <button
          onClick={toggleAvailable}
          disabled={pending}
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {available ? 'متاح' : 'غير متاح'}
        </button>
      </td>
      <td className="p-3 flex gap-1">
        <Link
          href={`/products/${product.id}`}
          target="_blank"
          className="p-2 rounded-lg hover:bg-luxor-sand/40 text-luxor-navy"
          title="فتح المنتج"
        >
          <ExternalLink size={14} />
        </Link>
        <button
          onClick={remove}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
          title="حذف"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
