-- Create RPC to get the most recent date with more than min_logs
create or replace function public.get_last_active_date(min_logs integer, current_date_str text)
returns date as $$
  select date 
  from public.daily_logs 
  where date < current_date_str::date
  group by date 
  having count(*) > min_logs 
  order by date desc 
  limit 1;
$$ language sql stable security definer;
