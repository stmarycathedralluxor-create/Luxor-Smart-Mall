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
6. Go to **Project Settings → API** → copy `Project URL` and `anon public` key

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
| `/dashboard/products/[id]`    | protected | Edit product                             |
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
