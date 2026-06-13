# 🏛️ Luxor Smart Mall - لوكسور سمارت مول

> The Smart Marketplace of Luxor — A PWA connecting Luxor sellers and buyers with direct WhatsApp ordering.

A bilingual (Arabic/English), RTL-ready Progressive Web App built with **Next.js 14**, **Supabase**, and **TailwindCSS**, designed for deployment on **Vercel**.

---

## ✨ Features

- 🛍️ **Marketplace platform** — sellers create stores, list products, buyers browse
- 🔒 **Admin approval workflow** — every new seller account AND every new store needs admin approval before going public
- 💰 **Protected pricing** — product prices are hidden behind an "Ask for Price" CTA. Anonymous users are redirected to login; logged-in users see the price + a WhatsApp order button
- 📱 **WhatsApp direct ordering** — orders open a pre-filled WhatsApp chat with the seller (no in-app payment/delivery)
- 🖼️ **Swipeable product gallery** — touch/mouse swipe, arrows, dots, and keyboard navigation
- 📊 **Live analytics counters** — total site visits, store visits, price inquiries, and orders (visible in both admin and seller dashboards)
- 🔐 **Auth: email/password + Google OAuth** — one-click signup with Google account
- 🌐 **Bilingual UI** — Arabic (RTL) + English (LTR) with a toggle, defaulting to Arabic
- 🎨 **Elegant pharaonic theme** — gold (#D4AF37), deep navy (#0F2A47), sandstone
- 🗄️ **Supabase Postgres + RLS** — secure row-level security; each user owns their store/products
- 🖼️ **Supabase Storage** — product images & store logos/covers
- 📲 **Installable PWA** — manifest + service worker, works offline (cached shell)
- 🔎 **Search & categories** — full-text product search across titles/descriptions

---

## 🆕 Recently Added (v2)

1. **Seller account approval** — when a user signs up as "Seller" the account is created but `wants_to_sell=true, is_seller_approved=false`. They can browse but can't open a store until an admin approves them via **/admin/approvals**.
2. **Store approval** — new stores start with `is_approved=false`. They stay hidden from public pages/stores listings until an admin approves them.
3. **Hidden prices** — `ProductCard` no longer shows the price. It shows an "Ask for Price" pill. On the product page the price area is replaced by a single CTA:
   - **Not logged in** → "Login to see the price" → redirects to `/login?next=/products/<id>?showPrice=1` (auto-reveals after login).
   - **Logged in** → logs a `price_inquiry` and reveals the price + an "Order via WhatsApp" button which also logs an `order` event before opening WhatsApp.
4. **Swipe product gallery** — pointer + touch swipe with arrows, dots, counter, and keyboard arrows.
5. **Analytics** — new tables `site_visits`, `store_visits`, `price_inquiries`, `orders`. A client `AnalyticsTracker` registers one site visit per browser per day; store pages, price inquiries, and orders are logged automatically via secure RPCs.
6. **Google sign-in** — both `/login` and `/signup` show a Google button. The signup page also has a mode chooser (buyer / seller). If the user selects "Seller", the seller-request flag flows through Google OAuth via the callback URL.
7. **Admin dashboard upgrade** — `/admin` now shows the four new live counters (site visits, store visits, price inquiries, orders), a pending-approvals alert, and a dedicated `/admin/approvals` page listing pending sellers and pending stores with one-click approve / reject.

> 📌 To activate v2: **run `supabase/migrations/0003_approvals_analytics.sql` once in the Supabase SQL editor**. It's idempotent and back-fills existing stores/sellers to `approved=true` so nothing breaks.

---

## 🆕 Recently Added (v10) — UX Polish, Sharing, Bulk Add & Catalog

1. **Empty number fields (no more confusing `0`)** — the product price, the "days to arrive" field, discount price and deposit no longer pre-fill with `0`. They start **empty** so the seller just clicks and types the real value. A clear validation message appears if the price is left empty.
2. **Fixed `+2` phone prefix** — the WhatsApp/phone inputs (signup, store, profile) now show a **locked `+2` prefix**; the seller types the rest starting from `0` (e.g. `01012345678`). The stored value is always normalized to `+201012345678`. Old numbers in any format are auto-normalized on display. (`components/PhoneInput.tsx`)
3. **Share system + correct preview image** — a **Share button** on the home page (site), every **store** page, every **product** page and the **catalog**. It uses the native mobile share sheet and falls back to a desktop menu (copy link / WhatsApp / Facebook / Telegram). Each page now has proper **Open Graph / Twitter** metadata via `generateMetadata`, so sharing a **product** shows the **product image** and sharing a **store** shows the **store profile (logo)**.
4. **Canonical links — no more random `www.`** — a new `siteUrl()` / `absoluteUrl()` helper always strips a leading `www.` and forces `https`, and `metadataBase` is set, so every share/canonical/OG link is consistent. (`lib/utils.ts`)
5. **Bulk product add (جدول)** — a new **/dashboard/products/bulk** page lets sellers add many products at once, one row per product, with **all** the normal product details (images, title, brand, price, discount, category, description, sizes, colors, fulfillment, availability, instant/preorder). An **"apply to all"** panel pushes a single value (color, fulfillment, category, brand, availability, delivery type, sizes) onto **every** row in one click. Rows can be duplicated or removed; all rows insert in a single batch.
6. **Modern magazine-style Catalog** — a new **/catalog** page presents all products in an **editorial, magazine-like** layout (a large feature tile + side tiles + an editorial grid). It has **preset filter chips** (All / Newest / Most-viewed / Deals / Under 500 / Premium) plus advanced filters: **search, category, brand, store, price range and sort**. Admins/sellers/buyers can land on a filtered view via query params (e.g. `/catalog?store=<id>`, `/catalog?category=<slug>`, `/catalog?preset=deals`). Each store page links to **"عرض ككتالوج"** for its own products. Clicking any product opens its product page.

> 📌 v10 needs **no new migration** — it builds entirely on the existing schema. Make sure `NEXT_PUBLIC_SITE_URL` is set to your real domain (without `www.`) so share/OG links and the preview image resolve correctly.

---

## 🆕 Recently Added (v9) — Store Crop-as-Metadata, Brands & Fulfillment Options

1. **Store logo & cover crop-as-metadata** — the same storage-saving system used for product images (v8) now applies to the store logo and cover. The original image is uploaded **once**; crop/zoom position is stored as JSON (`stores.logo_meta` / `stores.cover_meta`) and applied via CSS at render time. Re-cropping/zooming an existing logo or cover uploads **zero bytes** — only the JSON is updated. Rotation is the only case that re-uploads.
2. **Brands (البراندات)** — a new "Brand" field appears **before the product name** in the product form. Every brand a seller uses is registered once per store in the new `brands` table (RLS-protected, `unique(store_id, name)`), and shows up as a ready-made dropdown choice the next time they add a product. Sellers can also type a brand-new brand which auto-registers on save. The brand is displayed as a chip on the product card, on the product page, and in the WhatsApp order message.
3. **Fulfillment options (خيارات الاستلام)** — sellers can mark each product with one or more pickup/delivery options: **توصيل (delivery)**, **استلام من المتجر (store pickup)**, **استلام من عنوان (pickup from an address)** — with a required address field for the last one. Options are shown on the product page and included in the WhatsApp order message.

> 📌 To activate v9: **run `supabase/migrations/0012_store_crop_brands_fulfillment.sql` once in the Supabase SQL editor**. It's idempotent. Existing store logos/covers keep working (no crop meta = default display) and migrate to the new system on their next re-crop.

---

## 🆕 Recently Added (v8) — Crop-as-Metadata, Deposits & Rich WhatsApp Orders

1. **Crop stored as variables (huge storage saving)** — instead of uploading a cropped copy AND a full original (2 files per image), only the original image is stored once. Crop position/zoom is saved as JSON (`products.images_meta`: fractional `x/y/w/h`) and applied via CSS at render time (`<CroppedImage/>`). Re-cropping an existing image uploads **zero bytes** — it only updates the JSON. Rotation is the only case that re-uploads (the rotated file replaces the old one, still 1 file). Old products using the legacy `images_full` two-file system keep working and are automatically migrated to the new system on their next re-crop.
2. **Deposit / Down-payment (دفع مقدم)** — sellers can require a deposit per product, either a **percentage** (e.g. 25%) or a **fixed amount** (e.g. 100 EGP). Shown on the product page after price reveal (deposit value + remaining on delivery) and included in the WhatsApp order message.
3. **Rich WhatsApp order message** — the order message sent to the seller now contains ALL details: product title, category, price, discount % + savings, deposit + remaining, the buyer's **selected size & color** (or the available ones if not selected yet), availability (instant / preorder + arrival days), and the product link.
4. **Store logo cleanup** — removed the four golden corner brackets around the store logo frame.

> 📌 To activate v8: **run `supabase/migrations/0011_crop_meta_deposit.sql` once in the Supabase SQL editor**. It's idempotent.

---

## 🆕 Recently Added (v6) — Cache & Storage Overhaul

1. **No more stale pages** — deleted stores/products no longer "come back" or keep showing:
   - All public pages switched from ISR (60s cache) to **fully dynamic rendering** (`force-dynamic`).
   - Supabase server client now forces `cache: 'no-store'` on every request, so Next.js can never serve cached DB responses.
   - Next.js client **Router Cache disabled** (`experimental.staleTimes: 0`) — navigating between pages always fetches fresh data.
   - **`Cache-Control: no-store` headers** on every HTML response (build assets remain cached as they are immutable).
   - New global **`FreshnessGuard`** — refreshes server data when a page is restored from the browser Back/Forward Cache or the tab becomes visible after >30s.
   - **Service worker v3** — strict allowlist: only fixed static icons are ever cached. v2 was silently caching RSC payloads (client navigation data), which froze pages on old data.
2. **Deletes are now verified** — delete operations use `.select('id')` to confirm a row was actually removed (RLS silently matching 0 rows used to make items reappear). A clear Arabic error is shown otherwise.
3. **Storage is REALLY freed now** — the old DB triggers deleted only the `storage.objects` *record*, leaving the physical file orphaned forever (used space never went down). Cleanup now uses the official **Storage API** from the app:
   - Deleting a product → all its image files are removed from storage.
   - Deleting a store (admin delete or reject) → logo, cover, and **all product images** removed.
   - Removing/replacing an image in the product form, replacing a store logo/cover, or replacing an avatar → the old file is deleted.

> 📌 To activate v6: **run `supabase/migrations/0007_fix_storage_cleanup.sql` once in the Supabase SQL editor**. It drops the broken cleanup triggers (which raced with the app and orphaned files) and re-asserts owner/admin storage delete policies. Idempotent.

---

## 🆕 Recently Added (v5)

1. **Fixed view & visit counters** — product views and store visits were never counted (server-side fire-and-forget RPCs were silently dropped and ISR cached the pages). Counting now happens **client-side** via lightweight tracker components (`ProductViewTracker`, `StoreVisitTracker`) with sessionStorage dedup (one count per browser session).
2. **Public statistics** — the homepage hero now shows live totals (**site visits, store visits, product views** via `get_public_site_stats()`), each store page shows its **visit count** in the stats row, and the admin stores table got a **visits column**.
3. **Smart image compression** — the image editor now exports **WebP** (JPEG fallback for old Safari) with an adaptive quality loop targeting ≤220KB — typically **60–80% smaller** files without visible quality loss.
4. **Storage quotas** — every uploader gets a **200MB default quota** (admin can change per user via `profiles.storage_limit_mb`). Enforced at the DB level (storage INSERT policy) **and** pre-checked client-side with a friendly Arabic error. New **/admin/storage** page shows per-store usage with progress bars and per-user limit editing.
5. **Automatic storage cleanup** — deleting a product/store, removing an image from a product, or replacing a logo/cover/avatar now **deletes the old files from Supabase Storage** via DB triggers (previously files were orphaned forever).

> 📌 To activate v5: **run `supabase/migrations/0006_stats_storage.sql` once in the Supabase SQL editor**. Idempotent.

---

## 🆕 Recently Added (v4)

1. **Golden metal logo frame** — store profile pictures now have a thin **2px white inner frame** wrapped in a **metallic gold gradient outer frame** with **pharaonic corner brackets** (on store cards and the store page).
2. **Admin-granted verified badge** — `stores.is_verified` flag. The gold `BadgeCheck` badge only appears on stores the admin verifies via the toggle in **/admin/stores**. Sellers can't grant it to themselves (DB trigger protection).
3. **Store activation periods** — admin can activate a store for **1 month, 3 months, 6 months, 1 year, a custom months+days combo, or forever** (`stores.expires_at`, null = forever):
   - **Remaining-days counter** shown in the seller dashboard, admin overview, admin stores table, and the new **/admin/expiry** page.
   - Expired stores (and their products) are automatically hidden from all public pages.
   - **WhatsApp reminders**: the **/admin/expiry** center lists due notifications — *3 days left*, *1 day left*, and *closure*. One click opens WhatsApp with a prepared Arabic message and logs it (closure also deactivates the store). Each reminder is sent only once per expiry date.
4. **Pharaonic card redesign** — product & store cards now use a **black/gold elegant look**: metallic gold border, black obsidian image headers with a golden hairline, gold-on-black chips, and a **creamy white marble** card body (`.bg-marble`).

> 📌 To activate v4: **run `supabase/migrations/0005_verification_expiry.sql` once in the Supabase SQL editor**. Idempotent — existing stores remain "open forever" and unverified.

---

## 🆕 Recently Added (v3)

1. **Real-time image editor (crop / zoom / reposition)** — uploading a store cover, store logo, profile avatar, or product image now opens a live editor modal:
   - Drag the image to reposition it inside the exact frame used on the public site
   - Zoom with a slider, mouse-wheel, or two-finger pinch on mobile
   - 90° rotation + reset, rule-of-thirds grid, live preview in real time
   - On save the visible frame is rendered to canvas and uploaded as an optimized JPEG
   - Existing images can be re-edited any time via the "تعديل الموضع والحجم" button
2. **Profile avatar** — the profile page now supports uploading & editing a personal photo (saved instantly).
3. **Feedback + star ratings (real-time)** — products and stores now have a full reviews section:
   - 1–5 star rating + optional written feedback (one review per user, editable/deletable)
   - Average rating, review count, and a 5→1 distribution chart
   - **Live via Supabase Realtime** — new reviews appear instantly for everyone viewing the page, no refresh
   - Average star ratings shown on the product page header and the store header
4. **New tables/RPCs** — `reviews` table with RLS, `get_product_rating()` / `get_store_rating()` aggregates, realtime publication.

> 📌 To activate v3: **run `supabase/migrations/0004_reviews_ratings.sql` once in the Supabase SQL editor**. It's idempotent. Also make sure **Realtime** is enabled for your project (Database → Replication → the `supabase_realtime` publication should include `public.reviews` — the migration adds it automatically).

### Configuring Google OAuth in Supabase
1. In your Supabase project go to **Authentication → Providers → Google** and turn it **on**.
2. Create a Google OAuth client in [Google Cloud Console](https://console.cloud.google.com/) (Authorized redirect URI must be the value Supabase shows on that page, e.g. `https://<project>.supabase.co/auth/v1/callback`).
3. Paste the Client ID + Secret back into Supabase and save.
4. In your site env, make sure `NEXT_PUBLIC_SITE_URL` is set correctly — the Next.js callback (`/auth/callback`) is what completes the session.

---

## 🚀 Quick Start (3 steps)

### 1. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New project → name it `luxor-smart-mall`
2. Wait ~2 minutes for it to provision
3. Once ready, go to **SQL Editor** → paste the entire content of `supabase/migrations/0001_initial_schema.sql` → **Run**
4. Then paste `supabase/migrations/0002_admin_and_backfill.sql` → **Run** (adds admin role + backfills any users created before the trigger)
5. Then paste `supabase/migrations/0003_approvals_analytics.sql` → **Run** (adds seller/store approvals + analytics tables + tracking RPCs)
6. Then paste `supabase/migrations/0004_reviews_ratings.sql` → **Run** (adds real-time reviews & star ratings)
7. Go to **Project Settings → API** → copy `Project URL` and `anon public` key

### 🛡️ Create your first admin
After signing up your account on the live site, run this in Supabase SQL Editor:
```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR-EMAIL@example.com');
```
Then visit `/admin` — you'll see the full admin panel (users, stores, products moderation).

### 2. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Install & run
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🌐 Deploy to Vercel

### Option A: One-click via GitHub
1. Push this repo to GitHub (already done if you cloned from there)
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. **Add Environment Variables** (in the Vercel import wizard):
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
   - `NEXT_PUBLIC_SITE_URL` = `https://your-app.vercel.app` (update after first deploy)
5. Click **Deploy**

### Option B: Vercel CLI
```bash
npm i -g vercel
vercel
# Follow prompts, then add env vars in the Vercel dashboard
```

### Post-deploy
1. Update `NEXT_PUBLIC_SITE_URL` in Vercel env to your real domain, then redeploy
2. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: add `https://your-app.vercel.app/auth/callback`

---

## 📁 Project Structure
```
luxor-smart-mall/
├── app/
│   ├── (auth)/login, signup          # auth pages
│   ├── auth/callback                  # OAuth/email confirm callback
│   ├── dashboard/                     # seller dashboard (protected)
│   │   ├── store/                     # create/edit store
│   │   ├── products/                  # CRUD products
│   │   └── profile/                   # user profile
│   ├── stores/[slug]/                 # public store page
│   ├── products/[id]/                 # public product page (WhatsApp CTA)
│   ├── categories/[slug]/             # browse by category
│   ├── search/                        # search products
│   ├── layout.tsx, page.tsx           # root layout + home
│   └── globals.css                    # global styles + Tailwind
├── components/                        # reusable UI components
├── lib/
│   ├── supabase/                      # client/server/middleware Supabase
│   ├── i18n.ts                        # AR/EN translations
│   ├── types.ts                       # TypeScript types
│   └── utils.ts                       # helpers (whatsapp, slug, format)
├── public/
│   ├── icons/                         # PWA icons
│   ├── manifest.json                  # PWA manifest
│   └── sw.js                          # service worker
├── supabase/migrations/               # SQL migrations
├── middleware.ts                      # Supabase session refresh
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

---

## 🧩 Data Model

| Table         | Purpose                                                          |
|---------------|------------------------------------------------------------------|
| `profiles`    | Extends `auth.users` (full_name, phone, role, city)              |
| `stores`      | One per user — name, slug, whatsapp, logo, cover, city           |
| `products`    | Belongs to a store — title, price, images[], category, views     |
| `categories`  | Seeded 10 categories (Antiques, Clothing, Jewelry, etc.)         |

**Storage buckets**: `product-images`, `store-assets` (both public, auth-only upload).

**RLS policies**: All reads are public for active stores & available products. Writes are owner-only via `auth.uid()` checks.

---

## 🛣️ Routes Map

| Path                          | Type      | Description                              |
|-------------------------------|-----------|------------------------------------------|
| `/`                           | public    | Home (hero, featured stores/products)    |
| `/stores`                     | public    | All stores                               |
| `/stores/[slug]`              | public    | Single store + its products              |
| `/products/[id]`              | public    | Product details + WhatsApp CTA           |
| `/categories`                 | public    | All categories                           |
| `/categories/[slug]`          | public    | Category products                        |
| `/search?q=...`               | public    | Search results                           |
| `/login`, `/signup`           | public    | Auth                                     |
| `/dashboard`                  | protected | Seller overview                          |
| `/dashboard/store`            | protected | Create/edit store                        |
| `/dashboard/products`         | protected | List of own products                     |
| `/dashboard/products/new`     | protected | Add product                              |
| `/dashboard/products/bulk`    | protected | Bulk add products (table + apply-to-all) |
| `/dashboard/products/[id]`    | protected | Edit product                             |
| `/catalog`                    | public    | Magazine-style catalog with filters      |
| `/dashboard/profile`          | protected | Edit profile                             |
| `/admin`                      | admin     | Admin overview (stats + recent activity) |
| `/admin/users`                | admin     | Manage users + change roles              |
| `/admin/stores`               | admin     | Activate/deactivate/delete stores        |
| `/admin/products`             | admin     | Moderate/delete products                 |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router, Server Components, ISR)
- **Database & Auth**: Supabase (Postgres + RLS + Storage + Auth)
- **Styling**: TailwindCSS + custom theme
- **Icons**: lucide-react
- **Fonts**: Cairo (Arabic + Latin)
- **PWA**: Custom manifest + service worker (no extra deps)
- **Deployment**: Vercel (Edge runtime ready)

---

## 🧭 How It Works

1. **Buyer/Seller signs up** → email confirmation → profile auto-created
2. **Seller creates a store** → uploads logo/cover, sets WhatsApp number
3. **Seller adds products** → uploads up to 8 images per product
4. **Buyer browses** → home, categories, search, store pages
5. **Buyer clicks "Order via WhatsApp"** → opens WhatsApp with pre-filled message containing product details and direct link
6. **Seller & buyer chat** → arrange payment/delivery off-platform

---

## ✅ Currently Completed

- ✅ Bilingual UI (AR/EN) with RTL/LTR switching
- ✅ Auth (signup, login, email confirmation, session refresh)
- ✅ Store creation with logo/cover uploads
- ✅ Product CRUD with multi-image upload (up to 8)
- ✅ Public storefront with categories + search
- ✅ WhatsApp deep-link CTA on every product
- ✅ View counter (RPC)
- ✅ Seller dashboard with stats
- ✅ Profile management
- ✅ PWA (installable, offline shell)
- ✅ Pharaonic luxury design system
- ✅ Mobile-responsive throughout
- ✅ **Admin panel** — stats, user role management, store/product moderation
- ✅ **Auto-profile safety net** — any user signing in without a profile row gets one created automatically (fixes FK errors)

---

## 🔜 Not Yet Implemented (Suggested Next Steps)

- ⏳ Wishlist/Favorites for buyers
- ⏳ Multi-store per user (currently 1 store per user for simplicity)
- ⏳ Product reviews & ratings
- ⏳ Seller verification badge (with admin approval)
- ⏳ Phone OTP verification (Supabase Phone Auth + Twilio)
- ⏳ Push notifications via Web Push API
- ⏳ Order tracking (optional — currently handled off-platform)
- ⏳ Analytics dashboard for sellers (charts)
- ⏳ Featured/Sponsored stores (paid promotion)
- ⏳ Admin panel for moderation
- ⏳ Multiple currencies (currently EGP only)
- ⏳ SEO sitemap.xml + dynamic OG images

---

## 🐛 Troubleshooting

**"Invalid API key" on signup/login**
→ Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct and saved in `.env.local` (restart `npm run dev` after edits).

**Email confirmation link doesn't work**
→ In Supabase → Authentication → URL Configuration, ensure your site URL and `/auth/callback` are whitelisted.

**Images don't upload**
→ Check that the SQL migration created the `product-images` and `store-assets` storage buckets (re-run it if needed; the script is idempotent).

**Build fails on Vercel**
→ Make sure all 3 env vars are set in the Vercel project settings, then redeploy.

---

## 📜 License
MIT — Built with ❤️ for Luxor.

---

**Last updated**: 2026-06-09
**Status**: ✅ Ready for production deploy
