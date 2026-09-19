-- Item links: Mercari item / shop links get the automatic photo + price fetch, but ANY http(s) link is
-- accepted (the Owner then adds the photo and price by hand). Fetching stays restricted in the app/scraper
-- to the exact Mercari URL shapes; the database only makes sure the value is a plain web link.
--
-- Accepted shapes for automatic fetching (enforced in src/lib/mercari.ts and scraper/app/fetcher.py):
--   https://jp.mercari.com/item/m123            https://jp.mercari.com/en/item/m123
--   https://jp.mercari.com/shops/product/abc123 https://jp.mercari.com/en/shops/product/abc123

alter table public.items drop constraint items_mercari_url_check;
alter table public.items
  add constraint items_mercari_url_check
  check (mercari_url ~ '^https?://[^[:space:]]+$' and char_length(mercari_url) <= 2048);

-- The item id was "m<digits>" from the URL. It is now the last path segment of the link (m123, abc123 …),
-- or NULL when the link has no path. Generated columns cannot be altered, so drop/re-add it; the
-- Pasabuyer view depends on it, so it is dropped and recreated identically.
drop view public.pasabuyer_items;

alter table public.items drop column mercari_item_id;
alter table public.items
  add column mercari_item_id text generated always as (
    left(substring(mercari_url from '^https?://[^/]+/(?:[^?#]*/)?([^/?#]+)/?(?:[?#].*)?$'), 64)
  ) stored;

create view public.pasabuyer_items with (security_barrier = true) as
  select i.id,
         i.mercari_url,
         i.mercari_item_id,
         i.image_url,
         c.name as customer_name,
         i.notes,
         i.status,
         i.secured,          -- shown to users as "Packed"
         i.created_at
  from public.items i
  join public.customers c on c.id = i.customer_id
  where i.status = 'ONHAND'
    and i.company_id = public.auth_company_id();

revoke all on public.pasabuyer_items from anon, public;
grant select on public.pasabuyer_items to authenticated;
