-- New item status "SECURED" (the first pipeline stage). It is a separate migration from the one that
-- uses it, because a new enum value cannot be used in the same transaction that adds it.
alter type public.item_status add value if not exists 'SECURED' before 'JP_ADDRESS';
