'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="max-w-xl mx-auto"
    >
      <div className="relative">
        <Search className="absolute top-3.5 start-3 text-luxor-navy/40" size={20} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input-field ps-11 !py-3.5"
          placeholder="ابحث عن منتج..."
          autoFocus
        />
      </div>
    </form>
  );
}
