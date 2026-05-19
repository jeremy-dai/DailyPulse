-- Adds admin role + hidden flag, cascades daily_logs on profile delete,
-- and grants/policies so admins can delete profiles.

alter table profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists is_hidden boolean not null default false;

-- Replace daily_logs.user_id FK with ON DELETE CASCADE
alter table daily_logs drop constraint if exists daily_logs_user_id_fkey;
alter table daily_logs
  add constraint daily_logs_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

grant delete on public.profiles to authenticated;
grant delete on public.daily_logs to authenticated;

create or replace function public.is_admin(uid uuid)
returns boolean as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$ language sql stable security definer;

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile"
on profiles for update to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "Admins can delete any profile" on profiles;
create policy "Admins can delete any profile"
on profiles for delete to authenticated using (public.is_admin(auth.uid()));

-- Flip your own row to admin once, e.g.:
-- update profiles set is_admin = true where email = 'you@kawo.com';
