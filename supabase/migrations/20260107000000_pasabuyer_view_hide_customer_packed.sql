-- Pasabuyers no longer see the customer's name or the Packed flag. The view is the only thing they can
-- read, so removing the columns here is what enforces it (the UI just stops asking for them).
-- A view can't lose columns with "create or replace", so drop and recreate it (nothing depends on it).
drop view public.pasabuyer_items;

create view public.pasabuyer_items with (security_barrier = true) as
  select i.id,
         i.mercari_url,
         i.mercari_item_id,
         i.image_url,
         i.notes,
         i.status,
         i.created_at
  from public.items i
  where i.status = 'ONHAND'
    and i.company_id = public.auth_company_id();

revoke all on public.pasabuyer_items from anon, public;
grant select on public.pasabuyer_items to authenticated;
