-- Migration 005: belt-and-suspenders lockdown of kawo_profile_seed.
--
-- kawo_profile_seed holds raw KAWO tokens keyed by email until each user's
-- first Google login moves them into user_kawo_credentials. It must never be
-- readable from the browser. RLS is already deny-all; this also strips any API
-- grants so no anon/authenticated request can reach it at all. Only the
-- SECURITY DEFINER trigger and server-side service_role can read it.

revoke all on public.kawo_profile_seed from anon, authenticated, public;

-- RLS stays on (deny-all without policies); make the intent explicit.
alter table public.kawo_profile_seed enable row level security;
alter table public.kawo_profile_seed force row level security;

-- Verify: this should return no rows granting anon/authenticated any access.
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_name = 'kawo_profile_seed'
--   and grantee in ('anon', 'authenticated');

-- ── When migration is fully done (user_kawo_credentials populated for everyone),
-- ── drop the seed entirely:
-- drop table public.kawo_profile_seed;
