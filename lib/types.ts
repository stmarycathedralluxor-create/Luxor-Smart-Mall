export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'buyer' | 'seller' | 'both' | 'admin';
  avatar_url: string | null;
  city: string | null;
  created_at: string;
};

export type Store = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  whatsapp: string;
  logo_url: string | null;
  cover_url: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
};

export type Category = {
  id: number;
  slug: string;
  name_ar: string;
  name_en: string;
  icon: string | null;
};

export type Product = {
  id: string;
  store_id: string;
  category_id: number | null;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  images: string[];
  is_available: boolean;
  views: number;
  created_at: string;
};

export type ProductWithStore = Product & {
  store: Store;
  category: Category | null;
};
