-- ============================================================
-- Luxor Smart Mall - Admin Role + Profile Backfill
-- Run this AFTER 0001_initial_schema.sql in Supabase SQL Editor
-- Safe to re-run (idempotent)
-- ============================================================

-- 1) Allow 'admin' as a valid role
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('buyer','seller','both','admin'));

-- 2) BACKFILL: create a profile for any auth.user that doesn't have one yet
--    (fixes the "violates foreign key constraint" error)
insert into public.profiles (id, full_name, phone, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'phone', ''),
  'buyer'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 3) Re-ensure the trigger exists (in case 0001 didn't fully apply)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Helper: is_admin() function for use in RLS policies
create or replace function public.is_admin()
returns boolean
language sql security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 5) Admin RLS policies: admins can see/modify everything
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stores_admin_all" on public.stores;
create policy "stores_admin_all" on public.stores
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- 6) PROMOTE A USER TO ADMIN
--    ⬇️ Replace 'your-email@example.com' with YOUR email, then run this block
--
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'your-email@example.com');

-- 7) VERIFY
-- select u.email, p.role, p.created_at
-- from auth.users u
-- left join public.profiles p on p.id = u.id
-- order by u.created_at desc;
