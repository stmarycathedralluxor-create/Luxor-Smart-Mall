import type { ProductWithStore, Store } from '@/lib/types';

/** شريحة كتالوج واحدة = صورة واحدة لكل منتج (الصورة الأولى). */
export type CatalogSlide = {
  key: string;
  img: string | null;
  product: ProductWithStore;
};

/** متجر مختصر يُعرض في الكارت/العارض. */
export type CardStore = Pick<Store, 'name' | 'slug' | 'logo_url'> | null | undefined;

/**
 * يبني شرائح الكتالوج: صورة واحدة فقط لكل منتج (الصورة الأولى).
 * عدد المنتجات غير محدود، لكن لكل منتج صورة واحدة في العرض.
 */
export function buildCatalogSlides(products: ProductWithStore[]): CatalogSlide[] {
  return products.map((product) => ({
    key: String(product.id),
    img: product.images?.[0] ?? null,
    product,
  }));
}
