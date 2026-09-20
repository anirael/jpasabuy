-- Manual listings: an item can be created without a link (the Owner enters the photo, price and notes by hand).
-- The link is stored as NULL. The CHECK constraint from 20260104 still validates every link that IS given
-- (a NULL passes a CHECK), and the generated mercari_item_id column comes out NULL for these items.
alter table public.items alter column mercari_url drop not null;
