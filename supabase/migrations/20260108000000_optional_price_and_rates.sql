-- Price, rate and Pasabuyer rate are now optional (they can be filled in later). The CHECK constraints still
-- apply to any value that is given (a NULL passes a CHECK), and the generated total_price / pasabuyer_cost /
-- profit columns come out NULL until the values they depend on are set. sum() in the dashboard ignores NULLs.
alter table public.items
  alter column jp_price drop not null,
  alter column rate drop not null,
  alter column pasabuyer_rate drop not null;
