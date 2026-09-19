-- SECURED becomes the default status for new items, and shows in the dashboard's Order status chart.
alter table public.items alter column status set default 'SECURED';

create or replace function public.dashboard_charts(p_from timestamptz, p_to timestamptz, p_bucket text) returns jsonb
  language plpgsql stable security invoker set search_path = public as
$$
declare
  v_series jsonb;
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_bucket not in ('day', 'month', 'year') then
    raise exception 'invalid bucket' using errcode = '22023';
  end if;
  if p_to - p_from > interval '3700 days' then
    raise exception 'range too large' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object('period', to_char(g.p, 'YYYY-MM-DD'),
                              'profit', coalesce(d.profit, 0)::text,
                              'sales',  coalesce(d.sales, 0)::text)
           order by g.p), '[]'::jsonb)
    into v_series
  from generate_series(
         date_trunc(p_bucket, p_from at time zone 'Asia/Manila'),
         date_trunc(p_bucket, p_to   at time zone 'Asia/Manila'),
         ('1 ' || p_bucket)::interval) as g(p)
  left join (
    select date_trunc(p_bucket, delivered_at at time zone 'Asia/Manila') as p,
           sum(profit) as profit,
           sum(total_price) as sales
    from public.items
    where status = 'DELIVERED' and delivered_at >= p_from and delivered_at <= p_to
    group by 1
  ) d on d.p = g.p;

  return jsonb_build_object(
    'status', jsonb_build_object(
      'SECURED',    (select count(*) from public.items where status = 'SECURED'),
      'JP_ADDRESS', (select count(*) from public.items where status = 'JP_ADDRESS'),
      'ONHAND',     (select count(*) from public.items where status = 'ONHAND'),
      'DELIVERED',  (select count(*) from public.items where status = 'DELIVERED')),
    'series', v_series);
end
$$;
