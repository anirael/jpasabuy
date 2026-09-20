-- Item category (optional). Existing items keep NULL. The list is mirrored in src/lib/types.ts (CATEGORIES);
-- add a value in both places (and a new migration that replaces this constraint) to offer another category.
alter table public.items
  add column category text
  check (category is null or category in (
    'Anime', 'Pokemon', 'Sylvanian', 'Clothing', 'KPop', 'CD', 'Plush', 'Keychains', 'Stationery', 'One Piece', 'Figurines'
  ));
