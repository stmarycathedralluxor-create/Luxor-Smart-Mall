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

/**
 * بيانات قص الصورة المحفوظة كمتغيرات (بدلاً من تخزين صورة مقصوصة منفصلة).
 * كل القيم كسرية (0..1) نسبةً لأبعاد الصورة الأصلية بعد التدوير:
 *  x, y = الركن العلوي الأيسر لمنطقة القص — w, h = عرض/ارتفاع المنطقة
 *  r    = زاوية التدوير (0 | 90 | 180 | 270)
 */
export type ImageCrop = {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
};

/** مقاس متاح/غير متاح للمنتج */
export type ProductSize = {
  name: string;
  /** الكمية المتاحة (اختياري) */
  qty?: number | null;
  available: boolean;
};

/** لون للمنتج مع إمكانية ربطه بصورة */
export type ProductColor = {
  name: string;
  /** كود اللون hex للعرض */
  hex?: string | null;
  /** رابط صورة المنتج المرتبطة بهذا اللون */
  image?: string | null;
  available?: boolean;
};

export type Product = {
  id: string;
  store_id: string;
  category_id: number | null;
  title: string;
  description: string | null;
  price: number;
  /** السعر قبل الخصم — عندما يكون أكبر من price يظهر الخصم تلقائياً */
  compare_at_price?: number | null;
  currency: string;
  images: string[];
  /** الصور الأصلية كاملة الأبعاد — للمنتجات القديمة فقط (بنفس ترتيب images؛ '' = لا يوجد أصل) */
  images_full?: string[];
  /**
   * بيانات القص لكل صورة (بنفس ترتيب images).
   * عندما توجد بيانات قص لصورة، فإن images[i] هي الصورة الأصلية
   * الوحيدة المخزّنة ويُطبّق القص عليها بـ CSS عند العرض (لا ملف ثانٍ).
   * null = لا قص (عرض object-cover افتراضي) أو صورة قديمة مقصوصة فعلياً.
   */
  images_meta?: (ImageCrop | null)[];
  is_available: boolean;
  views: number;
  /** 'instant' = متاح فوراً — 'preorder' = حجز / طلب مسبق */
  delivery_type?: 'instant' | 'preorder';
  /** عدد أيام الوصول عند الحجز المسبق */
  delivery_days?: number | null;
  /** المقاسات المتاحة وغير المتاحة */
  sizes?: ProductSize[];
  /** الألوان مع صورها المرتبطة */
  colors?: ProductColor[];
  /** الدفع المقدم (عربون): none = بدون — percent = نسبة مئوية — amount = مبلغ ثابت */
  deposit_type?: 'none' | 'percent' | 'amount';
  /** قيمة العربون: النسبة (1-100) أو المبلغ بالجنيه */
  deposit_value?: number | null;
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
