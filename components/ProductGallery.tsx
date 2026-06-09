'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package } from 'lucide-react';

export default function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (!images?.length) {
    return (
      <div className="aspect-square rounded-2xl bg-luxor-sandlight flex items-center justify-center text-luxor-gold">
        <Package size={80} />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square relative rounded-2xl overflow-hidden bg-luxor-sandlight mb-3">
        <Image
          src={images[active]}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`aspect-square relative rounded-lg overflow-hidden border-2 transition ${
                active === i ? 'border-luxor-gold' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <Image src={img} alt={`${title}-${i}`} fill sizes="20vw" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
