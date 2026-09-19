-- Company logo choice (the Owner can already rename the company via the existing companies_update policy).
-- Keep this list in sync with src/lib/logos.ts.
alter table public.companies
  add column logo text not null default 'clover'
  check (logo in ('clover', 'sakura', 'flower', 'leaf', 'heart', 'gift', 'plane', 'bag'));
