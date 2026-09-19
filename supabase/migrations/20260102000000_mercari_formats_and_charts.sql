-- 1) Accept both Mercari link formats:
--      https://jp.mercari.com/en/item/m12345678
--      https://jp.mercari.com/item/m12345678
alter table public.items drop constraint items_mercari_url_check;
alter table public.items
  add constraint items_mercari_url_check
  check (mercari_url ~ '^https://jp\.mercari\.com/(en/)?item/m[0-9]+$');

-- 2) Dashboard charts (Owner only, SECURITY INVOKER so RLS still applies).
--    status : current number of items per status (all time)
--    series : delivered-item profit/sales per day | month | year in the range, zero-filled,
--             bucketed in Asia/Manila time. Money is returned as text (no float rounding).
create function public.dashboard_charts(p_from timestamptz, p_to timestamptz, p_bucket text) returns jsonb
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
      'JP_ADDRESS', (select count(*) from public.items where status = 'JP_ADDRESS'),
      'ONHAND',     (select count(*) from public.items where status = 'ONHAND'),
      'DELIVERED',  (select count(*) from public.items where status = 'DELIVERED')),
    'series', v_series);
end
$$;

revoke all on function public.dashboard_charts(timestamptz, timestamptz, text) from public, anon;
grant execute on function public.dashboard_charts(timestamptz, timestamptz, text) to authenticated;
