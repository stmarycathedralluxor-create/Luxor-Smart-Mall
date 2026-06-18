-- ============================================================
-- Luxor Smart Mall - Daily Analytics breakdown for Admin
-- Run this in Supabase SQL Editor (idempotent / safe to re-run)
-- ============================================================
--
-- Adds a single RPC: public.get_daily_analytics(p_days int)
-- Returns one row per calendar day (most recent first) with the
-- per-day counts of:
--   • site visits      (unique sessions per day)
--   • site page hits   (raw rows in site_visits per day)
--   • store visits
--   • price inquiries
--   • orders
--   • new users        (profiles created that day)
--   • new stores       (stores created that day)
--
-- Admin only. Days with zero activity are still returned (gap-filled),
-- so the dashboard always shows "every day" in the chosen window.
-- ============================================================

create or replace function public.get_daily_analytics(p_days int default 30)
returns table (
  day              date,
  site_visits      bigint,  -- unique sessions that day
  site_hits        bigint,  -- raw site_visits rows that day
  store_visits     bigint,
  price_inquiries  bigint,
  orders           bigint,
  new_users        bigint,
  new_stores       bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 365));
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return query
  with calendar as (
    -- صفّ لكل يوم في النافذة المطلوبة (حتى الأيام بلا نشاط)
    select (current_date - g)::date as day
    from generate_series(0, v_days - 1) as g
  ),
  sv as (
    select date_trunc('day', created_at)::date as day,
           count(distinct session_id) as uniq,
           count(*) as hits
    from public.site_visits
    where created_at >= current_date - (v_days - 1)
    group by 1
  ),
  stv as (
    select date_trunc('day', created_at)::date as day, count(*) as c
    from public.store_visits
    where created_at >= current_date - (v_days - 1)
    group by 1
  ),
  pi as (
    select date_trunc('day', created_at)::date as day, count(*) as c
    from public.price_inquiries
    where created_at >= current_date - (v_days - 1)
    group by 1
  ),
  ord as (
    select date_trunc('day', created_at)::date as day, count(*) as c
    from public.orders
    where created_at >= current_date - (v_days - 1)
    group by 1
  ),
  usr as (
    select date_trunc('day', created_at)::date as day, count(*) as c
    from public.profiles
    where created_at >= current_date - (v_days - 1)
    group by 1
  ),
  st as (
    select date_trunc('day', created_at)::date as day, count(*) as c
    from public.stores
    where created_at >= current_date - (v_days - 1)
    group by 1
  )
  select
    c.day,
    coalesce(sv.uniq, 0)  as site_visits,
    coalesce(sv.hits, 0)  as site_hits,
    coalesce(stv.c, 0)    as store_visits,
    coalesce(pi.c, 0)     as price_inquiries,
    coalesce(ord.c, 0)    as orders,
    coalesce(usr.c, 0)    as new_users,
    coalesce(st.c, 0)     as new_stores
  from calendar c
  left join sv  on sv.day  = c.day
  left join stv on stv.day = c.day
  left join pi  on pi.day  = c.day
  left join ord on ord.day = c.day
  left join usr on usr.day = c.day
  left join st  on st.day  = c.day
  order by c.day desc;
end;
$$;

grant execute on function public.get_daily_analytics(int) to authenticated;
