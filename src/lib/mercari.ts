// Item links.
//
// Any http(s) link can be saved on an item. Only these exact Mercari shapes are ever *fetched*
// (photo + price), so the server never requests an arbitrary URL. Keep in sync with
// scraper/app/fetcher.py and the DB check constraint in supabase/migrations/20260104000000_any_item_link.sql.

/** Normal Mercari listing: https://jp.mercari.com/item/m123 or …/en/item/m123 */
export const MERCARI_ITEM_RE = /^https:\/\/jp\.mercari\.com\/(?:en\/)?item\/m\d+$/;
/** Mercari Shops product: https://jp.mercari.com/shops/product/abc123 or …/en/shops/product/abc123 */
export const MERCARI_SHOP_RE = /^https:\/\/jp\.mercari\.com\/(?:en\/)?shops\/product\/[A-Za-z0-9_-]+$/;

/** True when the link can be read automatically (photo + price). */
export function isFetchableMercariUrl(url: string): boolean {
  return MERCARI_ITEM_RE.test(url) || MERCARI_SHOP_RE.test(url);
}

/** True for any acceptable item link: a plain http(s) URL, no spaces, at most 2048 characters. */
export function isValidItemLink(url: string): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2048 || /\s/.test(url)) return false;
  try {
    const u = new URL(url);
    return (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export const ITEM_LINK_ERROR = "Enter a valid link that starts with https:// (for example https://jp.mercari.com/item/m12345678901).";

/** Shown under the link field when it is valid but cannot be read automatically. */
export const MANUAL_LINK_NOTE =
  "We can’t read the photo and price from this kind of link. That’s fine — paste a photo (Ctrl+V), paste an image link or upload one, and enter the price yourself.";

/**
 * The main photo of a normal Mercari listing lives at a predictable CDN path (same trick as the
 * Google Sheets script), so it never depends on scraping. Shop products have no such path.
 */
export function mercariImageUrl(url: string): string | null {
  const m = /^https:\/\/jp\.mercari\.com\/(?:en\/)?item\/(m\d+)$/.exec(url);
  return m ? `https://static.mercdn.net/item/detail/orig/photos/${m[1]}_1.jpg` : null;
}
