# 🚀 Migration: Supabase Storage → Cloudflare R2

All image operations (upload, delete, replace, quota/size accounting) now run on
**Cloudflare R2** instead of Supabase Storage. Old images already on Supabase keep
working and are still cleaned up automatically during the transition.

---

## Why R2? (Performance & Cost)

| | Supabase Storage (Free) | Cloudflare R2 |
|---|---|---|
| Egress (bandwidth) | counted against 2GB/mo cap | **$0 — unlimited free egress** |
| Delivery | single region | **Cloudflare global edge CDN (300+ cities)** |
| Free storage | 1 GB | **10 GB/month** |
| Cache | basic | `immutable` + edge cache → near-instant repeat loads |

---

## ✅ Step 1 — Create the R2 bucket (5 minutes)

1. Go to https://dash.cloudflare.com → **R2 Object Storage** (activate it if asked — the free plan needs no credit card in most regions).
2. Click **Create bucket** → name it `luxor-smart-mall` → location **Automatic** → Create.
3. Open the bucket → **Settings** tab → **Public access**:
   - **Option A (quick):** under *R2.dev subdomain* click **Allow Access** and copy the URL, e.g. `https://pub-xxxxxxxxxxxx.r2.dev`
   - **Option B (best performance, recommended):** under *Custom Domains* connect a domain you own on Cloudflare, e.g. `cdn.yoursite.com` — custom domains get full CDN caching.
4. (Recommended) **Settings → CORS policy** → add:
   ```json
   [
     {
       "AllowedOrigins": ["*"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```

## ✅ Step 2 — Create the R2 API token

1. R2 overview page → **Manage R2 API Tokens** → **Create API Token**.
2. Permissions: **Object Read & Write**. Scope: *Apply to specific buckets* → select `luxor-smart-mall`.
3. Click **Create** and copy:
   - **Access Key ID**
   - **Secret Access Key**
4. Your **Account ID** is shown on the R2 overview page (right sidebar) or in the dashboard URL.

## ✅ Step 3 — Add environment variables

**Vercel:** Project → Settings → Environment Variables → add for *Production, Preview & Development*:

| Variable | Value |
|---|---|
| `R2_ACCOUNT_ID` | your Cloudflare account id |
| `R2_ACCESS_KEY_ID` | from step 2 |
| `R2_SECRET_ACCESS_KEY` | from step 2 |
| `R2_BUCKET_NAME` | `luxor-smart-mall` |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | `https://pub-xxxx.r2.dev` or `https://cdn.yoursite.com` (no trailing slash) |

**Local:** copy the same vars into `.env.local` (see `.env.example`).

> ⚠️ `R2_SECRET_ACCESS_KEY` is server-only — it is never exposed to the browser.
> Only `NEXT_PUBLIC_R2_PUBLIC_URL` (a public URL) is visible client-side.

## ✅ Step 4 — Run the database migration

Supabase Dashboard → **SQL Editor** → paste & run:

```
supabase/migrations/0009_r2_storage.sql
```

This (idempotent) migration:
- creates `public.user_files` — tracks every R2 object's size per user (quota accounting);
- updates `get_user_storage_bytes()` and `get_storage_usage_admin()` to count **R2 + legacy Supabase** files together, so the admin Storage page and the 200MB per-user quota keep working exactly as before;
- drops the old Supabase-storage cleanup triggers (cleanup now happens server-side against R2).

## ✅ Step 5 — Redeploy

Push to `main` (merge the PR) → Vercel redeploys automatically. Done ✅

---

## 🧪 Verify it works

1. Log in as a seller → add a product with images → the image URLs should start with your `NEXT_PUBLIC_R2_PUBLIC_URL`.
2. Delete the product → the files disappear from the R2 bucket (check the bucket's object list) and the admin Storage page usage drops.
3. Admin → **مساحة التخزين**: usage/limits show combined R2 + legacy numbers.
4. Old products with Supabase URLs still render and still get cleaned up when deleted.

---

## 🔁 How to ROLL BACK to the previous version

A git tag **`pre-r2-migration`** marks the exact commit before this change.

**Full rollback (code):**
```bash
git checkout main
git reset --hard pre-r2-migration
git push -f origin main          # Vercel redeploys the old version
```
*(or without rewriting history:)*
```bash
git revert -m 1 <merge-commit-of-the-R2-PR>
git push origin main
```

**Database rollback:** re-run `supabase/migrations/0006_stats_storage.sql` in the
SQL Editor — it recreates the original quota functions and cleanup triggers.
The `user_files` table is harmless to keep (or `drop table public.user_files;`).

**Images uploaded while R2 was active:** their URLs point to R2; keep
`NEXT_PUBLIC_R2_PUBLIC_URL` working (don't delete the bucket) and the old code
will still display them — it just won't upload new ones there.

---

## 🏗️ Architecture

```
Browser (compress to WebP in ImageEditor)
   │  multipart POST
   ▼
/api/storage/upload  ── auth (Supabase session) ── quota check (RPC)
   │  S3 PutObject (immutable cache headers)
   ▼
Cloudflare R2 bucket ──► served worldwide via Cloudflare edge CDN
   │
   └─ row in public.user_files (size accounting for quotas)

Deletes: /api/storage/remove → batch DeleteObjects (R2) + legacy Supabase
         cleanup + user_files rows removed → quota frees instantly.
Ownership: object keys are {bucket}/{userId}/{file} — non-admins can only
           delete keys under their own folder; admins can delete anything
           and deep-sweep a whole owner folder on store deletion.
```

### Files changed
| File | Role |
|---|---|
| `lib/r2.ts` | server-only S3 client for R2 (upload / batch delete / list) |
| `lib/storage-server.ts` | server cleanup helpers (R2 + legacy Supabase) |
| `lib/storage.ts` | client helpers — now call `/api/storage/*` |
| `app/api/storage/upload/route.ts` | authenticated upload + quota enforcement |
| `app/api/storage/remove/route.ts` | authenticated delete + ownership checks |
| `app/dashboard/**` + `app/admin/**` forms/buttons | switched to the new helpers |
| `supabase/migrations/0009_r2_storage.sql` | quota tracking for R2 |
| `next.config.mjs` | allow R2 image hosts + 1-year image cache |
