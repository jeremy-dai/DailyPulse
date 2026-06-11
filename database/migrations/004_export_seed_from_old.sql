-- Export step for migration 004.
--
-- Run this against the OLD shared Supabase project (the one hi-kevin and
-- kevin-analysis used: project ref vxxyqdtjstvvdbkecwua), in its SQL editor.
--
-- It prints one INSERT per user. Copy the entire output and run it in the
-- DailyPulse project AFTER running 004_kawo_credentials.sql.

select string_agg(
  format(
    'insert into public.kawo_profile_seed (email, full_name, kawo_token, kawo_org_id, kawo_brand_id, kawo_api_url) values (%L,%L,%L,%L,%L,%L) on conflict (email) do update set full_name=excluded.full_name, kawo_token=excluded.kawo_token, kawo_org_id=excluded.kawo_org_id, kawo_brand_id=excluded.kawo_brand_id, kawo_api_url=excluded.kawo_api_url;',
    lower(email), full_name, kawo_token, kawo_org_id, kawo_brand_id, kawo_api_url
  ),
  E'\n'
)
from public.profiles
where email is not null;
