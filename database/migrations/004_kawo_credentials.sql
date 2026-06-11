-- Migration 004: KAWO credentials for hi-kevin / kevin-analysis users
--
-- Context: hi-kevin and kevin-analysis are being re-pointed from their old
-- shared Supabase project onto THIS (DailyPulse) project + Google login.
-- Those apps need per-user KAWO context (token / org / brand / api_url).
--
-- These MUST NOT live on `profiles`: the profiles RLS lets every authenticated
-- user read every profile row (team dashboard needs that), which would leak
-- each user's KAWO API token to the whole team. So they live in a separate
-- table whose RLS only lets a user see their OWN row.
--
-- Run this in the DailyPulse Supabase SQL editor.

-- 1. Per-user KAWO credentials (owner-readable only)
create table if not exists public.user_kawo_credentials (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  kawo_token text,
  kawo_org_id text,
  kawo_brand_id text,
  kawo_api_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

grant select, insert, update, delete on public.user_kawo_credentials to authenticated;

alter table public.user_kawo_credentials enable row level security;

create policy "Users read their own kawo credentials"
on public.user_kawo_credentials for select to authenticated
using (auth.uid() = user_id);

create policy "Users insert their own kawo credentials"
on public.user_kawo_credentials for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users update their own kawo credentials"
on public.user_kawo_credentials for update to authenticated
using (auth.uid() = user_id);

-- 2. Seed table: data exported from the OLD supabase project, keyed by email.
--    A user's auth.users id differs between the two projects, so email is the
--    only stable join key. Populate this with the output of
--    004_export_seed_from_old.sql (run against the OLD project).
create table if not exists public.kawo_profile_seed (
  email text primary key,
  full_name text,
  kawo_token text,
  kawo_org_id text,
  kawo_brand_id text,
  kawo_api_url text
);

-- Seed is internal/admin only — no grants to authenticated/anon, so RLS-less
-- access is impossible via the Data API. (SECURITY DEFINER trigger below still
-- reads it.) Keep it locked down.
alter table public.kawo_profile_seed enable row level security;

-- 3. On Google signup, copy the user's KAWO context from the seed by email.
--    Replaces the prior handle_new_user so it also seeds credentials + name.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  seed public.kawo_profile_seed%rowtype;
begin
  select * into seed from public.kawo_profile_seed where email = lower(new.email);

  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', seed.full_name),
    new.raw_user_meta_data->>'avatar_url'
  );

  if seed.email is not null then
    insert into public.user_kawo_credentials
      (user_id, kawo_token, kawo_org_id, kawo_brand_id, kawo_api_url)
    values
      (new.id, seed.kawo_token, seed.kawo_org_id, seed.kawo_brand_id, seed.kawo_api_url);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- 4. Backfill: any user who ALREADY signed into DailyPulse before this
--    migration won't have fired the new trigger. Seed them now.
insert into public.user_kawo_credentials
  (user_id, kawo_token, kawo_org_id, kawo_brand_id, kawo_api_url)
select p.id, s.kawo_token, s.kawo_org_id, s.kawo_brand_id, s.kawo_api_url
from public.profiles p
join public.kawo_profile_seed s on s.email = lower(p.email)
on conflict (user_id) do update set
  kawo_token = excluded.kawo_token,
  kawo_org_id = excluded.kawo_org_id,
  kawo_brand_id = excluded.kawo_brand_id,
  kawo_api_url = excluded.kawo_api_url,
  updated_at = timezone('utc'::text, now());

-- Backfill display name for existing rows that have none.
update public.profiles p
set name = s.full_name
from public.kawo_profile_seed s
where s.email = lower(p.email) and (p.name is null or p.name = '');
