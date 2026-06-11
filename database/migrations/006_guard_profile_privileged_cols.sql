-- Migration 006: prevent privilege escalation via profiles.is_admin / is_hidden.
--
-- profiles has `grant update` on ALL columns + an ownership-only RLS policy
-- ("Users can update their own profile" using auth.uid() = id). RLS guards
-- which ROW you may update, not which COLUMNS — so any authenticated user can
-- run `update profiles set is_admin = true where id = auth.uid()` from the
-- browser and make themselves admin (then update/delete every other profile).
--
-- Column-level grants can't fix this: admins legitimately write is_admin /
-- is_hidden from the admin dashboard, and grants apply to the whole
-- `authenticated` role. A BEFORE UPDATE trigger lets us check the *caller*.
--
-- BEFORE running this: audit for anyone who may have already self-escalated:
--   select email, is_admin from public.profiles where is_admin = true;
-- Fix any unexpected rows first. The trigger fires on ALL updates including
-- the SQL editor (where auth.uid() is null -> is_admin(null) = false), so once
-- it exists, demoting someone needs `disable trigger` around the update.

create or replace function public.guard_privileged_profile_cols()
returns trigger as $$
begin
  if (new.is_admin is distinct from old.is_admin
      or new.is_hidden is distinct from old.is_hidden)
     and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change is_admin/is_hidden';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists guard_profile_privileged_cols on public.profiles;
create trigger guard_profile_privileged_cols
  before update on public.profiles
  for each row execute function public.guard_privileged_profile_cols();
