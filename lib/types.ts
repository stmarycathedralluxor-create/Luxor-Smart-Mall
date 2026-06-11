export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: 'buyer' | 'seller' | 'both' | 'admin';
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  is_seller_approved?: boolean;
  wants_to_sell?: boolean;
  /** Admin-set storage limit in MB (null = default 200MB) */
  storage_limit_mb?: number | null;
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
  is_approved?: boolean;
  is_verified?: boolean;
  activated_at?: string | null;
  expires_at?: string | null;
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
  /** 'instant' = متاح فوراً — 'preorder' = حجز / طلب مسبق */
  delivery_type?: 'instant' | 'preorder';
  /** عدد أيام الوصول عند الحجز المسبق */
  delivery_days?: number | null;
  created_at: string;
};

export type ProductWithStore = Product & {
  store: Store;
  category: Category | null;
};

export type AdminCounters = {
  site_visits: number;
  store_visits: number;
  price_inquiries: number;
  orders: number;
  pending_sellers: number;
  pending_stores: number;
};

export type Review = {
  id: string;
  user_id: string;
  product_id: string | null;
  store_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: Pick<Profile, 'full_name' | 'avatar_url'> | null;
};

export type RatingSummary = {
  avg_rating: number;
  review_count: number;
};

export type StoreCounters = {
  visits: number;
  price_inquiries: number;
  orders: number;
};
