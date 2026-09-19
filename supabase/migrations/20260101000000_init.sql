-- Japan Pasabuy Inventory System — initial schema
-- Tenancy + roles are enforced here (Row Level Security), not only in the app.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('OWNER', 'PASABUYER');
create type public.item_status as enum ('JP_ADDRESS', 'ONHAND', 'DELIVERED');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

-- One row per app user. Passwords live in Supabase Auth (auth.users, bcrypt-hashed);
-- this table adds company membership + role. Every user belongs to exactly ONE company.
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 120),
  email      text not null,
  role       public.user_role not null,
  created_at timestamptz not null default now()
);
create index profiles_company_idx on public.profiles (company_id);

-- Helpers used by RLS policies. SECURITY DEFINER so they can read profiles
-- without recursing through profiles' own policies.
create function public.auth_company_id() returns uuid
  language sql stable security definer set search_path = public as
$$ select company_id from public.profiles where id = auth.uid() $$;

create function public.is_owner() returns boolean
  language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'OWNER') $$;

revoke all on function public.auth_company_id() from public, anon;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.auth_company_id() to authenticated;
grant execute on function public.is_owner() to authenticated;

create table public.customers (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null default public.auth_company_id() references public.companies (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 120),
  shipping_address text not null default '' check (char_length(shipping_address) <= 500),
  created_at       timestamptz not null default now()
);
create index customers_company_created_idx on public.customers (company_id, created_at desc);

create table public.items (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null default public.auth_company_id() references public.companies (id) on delete cascade,
  -- RESTRICT: a customer that still has items cannot be deleted by accident.
  customer_id     uuid not null references public.customers (id) on delete restrict,
  mercari_url     text not null check (mercari_url ~ '^https://jp\.mercari\.com/en/item/m[0-9]+$'),
  mercari_item_id text generated always as (substring(mercari_url from 'm[0-9]+$')) stored,
  image_url       text check (image_url is null or (image_url ~ '^https?://' and char_length(image_url) <= 2048)),
  jp_price        numeric(12, 0) not null check (jp_price > 0),                 -- whole JPY
  rate            numeric(3, 2)  not null check (rate between 0.40 and 0.50),   -- JPY -> PHP charged to customer
  pasabuyer_rate  numeric(3, 2)  not null check (pasabuyer_rate between 0.40 and 0.50),
  -- Computed by the database so the client can never send its own totals.
  total_price     numeric(14, 2) generated always as (round(jp_price * rate, 2)) stored,
  pasabuyer_cost  numeric(14, 2) generated always as (round(jp_price * pasabuyer_rate, 2)) stored,
  profit          numeric(14, 2) generated always as (round(jp_price * rate, 2) - round(jp_price * pasabuyer_rate, 2)) stored,
  status          public.item_status not null default 'JP_ADDRESS',
  secured         boolean not null default false,
  notes           text not null default '' check (char_length(notes) <= 2000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  delivered_at    timestamptz
);
create index items_company_status_idx on public.items (company_id, status);
create index items_customer_idx on public.items (customer_id);
create index items_delivered_idx on public.items (company_id, delivered_at) where status = 'DELIVERED';

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function public.lock_company_id() returns trigger
  language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot be changed';
  end if;
  return new;
end
$$;

create trigger customers_lock_company before update on public.customers
  for each row execute function public.lock_company_id();

create function public.items_before_write() returns trigger
  language plpgsql as
$$
begin
  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'company_id cannot be changed';
  end if;

  -- The customer must belong to the same company as the item.
  if not exists (
    select 1 from public.customers c where c.id = new.customer_id and c.company_id = new.company_id
  ) then
    raise exception 'customer does not belong to this company';
  end if;

  new.updated_at := now();
  if new.status = 'DELIVERED' then
    new.delivered_at := coalesce(new.delivered_at, now());
  else
    new.delivered_at := null;
  end if;
  return new;
end
$$;

create trigger items_before_write before insert or update on public.items
  for each row execute function public.items_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.items     enable row level security;

-- Companies: members can read their own; the Owner can rename it.
create policy companies_select on public.companies for select to authenticated
  using (id = public.auth_company_id());
create policy companies_update on public.companies for update to authenticated
  using (id = public.auth_company_id() and public.is_owner())
  with check (id = public.auth_company_id() and public.is_owner());

-- Profiles: read-only from the client (own row; the Owner sees their company's team).
-- Creating/removing accounts goes through server code using the service role.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or (public.is_owner() and company_id = public.auth_company_id()));

-- Customers and Items: OWNER of the same company only. PASABUYERs get no direct access.
create policy customers_owner_all on public.customers for all to authenticated
  using (public.is_owner() and company_id = public.auth_company_id())
  with check (public.is_owner() and company_id = public.auth_company_id());

create policy items_owner_all on public.items for all to authenticated
  using (public.is_owner() and company_id = public.auth_company_id())
  with check (public.is_owner() and company_id = public.auth_company_id());

-- ---------------------------------------------------------------------------
-- Pasabuyer read-only view: ONHAND items of their own company, NO financial columns
-- (no jp_price / rate / pasabuyer_rate / total / cost / profit) and no customer address.
-- The view runs with its owner's rights, so the company/status filter below is the gate.
-- ---------------------------------------------------------------------------
create view public.pasabuyer_items with (security_barrier = true) as
  select i.id,
         i.mercari_url,
         i.mercari_item_id,
         i.image_url,
         c.name as customer_name,
         i.notes,
         i.status,
         i.secured,
         i.created_at
  from public.items i
  join public.customers c on c.id = i.customer_id
  where i.status = 'ONHAND'
    and i.company_id = public.auth_company_id();

-- ---------------------------------------------------------------------------
-- Dashboard stats (Owner only). SECURITY INVOKER, so RLS still applies.
-- Money is returned as text to avoid float rounding on the way to the browser.
-- ---------------------------------------------------------------------------
create function public.dashboard_stats(p_from timestamptz, p_to timestamptz) returns jsonb
  language plpgsql stable security invoker set search_path = public as
$$
begin
  if not public.is_owner() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_delivered', (select count(*) from public.items
                        where status = 'DELIVERED' and delivered_at >= p_from and delivered_at <= p_to),
    'total_sales',     (select coalesce(sum(total_price), 0)::text from public.items
                        where status = 'DELIVERED' and delivered_at >= p_from and delivered_at <= p_to),
    'total_profit',    (select coalesce(sum(profit), 0)::text from public.items
                        where status = 'DELIVERED' and delivered_at >= p_from and delivered_at <= p_to),
    'new_clients',     (select count(*) from public.customers
                        where created_at >= p_from and created_at <= p_to),
    'jp_address',      (select count(*) from public.items where status = 'JP_ADDRESS'),
    'onhand',          (select count(*) from public.items where status = 'ONHAND')
  );
end
$$;

-- ---------------------------------------------------------------------------
-- Grants: nothing for anon; authenticated only what RLS then narrows down.
-- ---------------------------------------------------------------------------
revoke all on public.companies, public.profiles, public.customers, public.items, public.pasabuyer_items from anon, public;
revoke all on function public.dashboard_stats(timestamptz, timestamptz) from public, anon;

grant select, update on public.companies to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.customers, public.items to authenticated;
grant select on public.pasabuyer_items to authenticated;
grant execute on function public.dashboard_stats(timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public-read bucket for uploaded item photos; only the Owner may write,
-- and only inside their own company's folder (<company_id>/<file>).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy item_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'item-images' and public.is_owner()
              and (storage.foldername(name))[1] = public.auth_company_id()::text);
create policy item_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'item-images' and public.is_owner()
         and (storage.foldername(name))[1] = public.auth_company_id()::text);
