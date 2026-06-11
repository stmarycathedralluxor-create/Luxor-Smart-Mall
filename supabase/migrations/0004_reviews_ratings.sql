-- ============================================================
-- Luxor Smart Mall - v3: Reviews & Star Ratings (real-time)
-- Run once in the Supabase SQL Editor. Idempotent.
-- ============================================================

-- 1) REVIEWS TABLE (works for both products and stores)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a review must target exactly one of (product, store)
  check (
    (product_id is not null and store_id is null)
    or (product_id is null and store_id is not null)
  )
);

-- one review per user per product / per store (editable, not duplicated)
create unique index if not exists uq_reviews_user_product
  on public.reviews(user_id, product_id) where product_id is not null;
create unique index if not exists uq_reviews_user_store
  on public.reviews(user_id, store_id) where store_id is not null;

create index if not exists idx_reviews_product on public.reviews(product_id, created_at desc);
create index if not exists idx_reviews_store on public.reviews(store_id, created_at desc);

-- updated_at trigger (reuses set_updated_at from 0001)
drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

-- 2) ROW LEVEL SECURITY
alter table public.reviews enable row level security;

drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews
  for select using (true);

drop policy if exists "reviews_auth_insert" on public.reviews;
create policy "reviews_auth_insert" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_owner_update" on public.reviews;
create policy "reviews_owner_update" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews_owner_delete" on public.reviews;
create policy "reviews_owner_delete" on public.reviews
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 3) RATING SUMMARY RPCs (fast aggregates)
create or replace function public.get_product_rating(p_product_id uuid)
returns table (avg_rating numeric, review_count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
  from public.reviews where product_id = p_product_id;
$$;

create or replace function public.get_store_rating(p_store_id uuid)
returns table (avg_rating numeric, review_count bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(round(avg(rating)::numeric, 1), 0), count(*)
  from public.reviews where store_id = p_store_id;
$$;

-- 4) REAL-TIME: broadcast review changes to clients
do $$
begin
  alter publication supabase_realtime add table public.reviews;
exception when duplicate_object then
  null; -- already added
end $$;
