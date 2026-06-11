-- ============================================================
-- Luxor Smart Mall - v4: Verified Badge + Store Activation Period
-- Run once in the Supabase SQL Editor. Idempotent.
-- ============================================================

-- 1) VERIFIED BADGE (admin-granted)
alter table public.stores
  add column if not exists is_verified boolean not null default false;

create index if not exists idx_stores_verified on public.stores(is_verified);

-- 2) ACTIVATION PERIOD
-- expires_at = null  →  open forever
-- expires_at < now() →  store is considered expired (hidden from public)
alter table public.stores
  add column if not exists activated_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists idx_stores_expires on public.stores(expires_at);

-- 3) EXPIRY NOTIFICATION LOG
-- Tracks which reminders were already sent so we never send twice.
-- kind: 'reminder_3d' | 'reminder_1d' | 'closure'
create table if not exists public.store_expiry_notifications (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null check (kind in ('reminder_3d','reminder_1d','closure')),
  -- the expiry the notification refers to; if admin extends the period,
  -- new reminders are allowed again for the new expiry date
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  unique (store_id, kind, expires_at)
);

alter table public.store_expiry_notifications enable row level security;

drop policy if exists "expiry_notif_admin_all" on public.store_expiry_notifications;
create policy "expiry_notif_admin_all" on public.store_expiry_notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- 4) Helper: is a store currently within its activation window?
create or replace function public.store_is_open(s public.stores)
returns boolean
language sql
stable
as $$
  select s.is_active
     and coalesce(s.is_approved, true)
     and (s.expires_at is null or s.expires_at > now());
$$;

-- 5) RPC: list stores that need an expiry reminder / closure action.
-- Returns one row per (store, kind) that has NOT been logged yet.
create or replace function public.get_expiring_stores()
returns table (
  store_id uuid,
  store_name text,
  store_slug text,
  whatsapp text,
  owner_name text,
  expires_at timestamptz,
  days_left numeric,
  kind text
)
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select
      s.id, s.name, s.slug, s.whatsapp, p.full_name, s.expires_at,
      extract(epoch from (s.expires_at - now())) / 86400.0 as days_left
    from public.stores s
    join public.profiles p on p.id = s.owner_id
    where s.expires_at is not null
      and s.is_active = true
  ),
  kinds as (
    select c.*, k.kind
    from candidates c
    cross join lateral (
      values ('reminder_3d'), ('reminder_1d'), ('closure')
    ) as k(kind)
    where
      (k.kind = 'reminder_3d' and c.days_left <= 3 and c.days_left > 1) or
      (k.kind = 'reminder_1d' and c.days_left <= 1 and c.days_left > 0) or
      (k.kind = 'closure'     and c.days_left <= 0)
  )
  select
    k.id, k.name, k.slug, k.whatsapp, k.full_name, k.expires_at,
    round(k.days_left::numeric, 2), k.kind
  from kinds k
  where not exists (
    select 1 from public.store_expiry_notifications n
    where n.store_id = k.id and n.kind = k.kind and n.expires_at = k.expires_at
  )
  order by k.expires_at asc;
$$;

-- 6) RPC: mark a notification as sent (admin only via RLS-bypassing definer,
-- but guarded by is_admin check inside)
create or replace function public.log_expiry_notification(p_store_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expires timestamptz;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select expires_at into v_expires from public.stores where id = p_store_id;
  if v_expires is null then return; end if;
  insert into public.store_expiry_notifications (store_id, kind, expires_at)
  values (p_store_id, p_kind, v_expires)
  on conflict (store_id, kind, expires_at) do nothing;
  -- closure also deactivates the store
  if p_kind = 'closure' then
    update public.stores set is_active = false where id = p_store_id;
  end if;
end;
$$;

-- 7) Protect admin-only columns: sellers must NOT be able to grant
-- themselves verification or extend their own activation period.
create or replace function public.protect_store_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    -- revert any attempt to change admin-only columns
    new.is_verified  := old.is_verified;
    new.is_approved  := old.is_approved;
    new.expires_at   := old.expires_at;
    new.activated_at := old.activated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_store_admin_columns on public.stores;
create trigger trg_protect_store_admin_columns
  before update on public.stores
  for each row
  execute function public.protect_store_admin_columns();

-- 8) Backfill: existing stores stay open forever (expires_at stays null)
update public.stores set activated_at = created_at where activated_at is null;
