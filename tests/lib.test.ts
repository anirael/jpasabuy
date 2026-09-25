import { test } from "node:test";
import assert from "node:assert/strict";
import { calc, decimalToCentavos, formatPHP, formatPHPDecimal, rateToHundredths, RATE_OPTIONS } from "../src/lib/money.ts";
import { isFetchableMercariUrl, isValidItemLink, mercariImageUrl, mercariThumbUrl } from "../src/lib/mercari.ts";

test("rate options are .40 … .50 in 0.01 steps", () => {
  assert.equal(RATE_OPTIONS.length, 11);
  assert.deepEqual(RATE_OPTIONS.map((r) => r.toFixed(2)), ["0.40", "0.41", "0.42", "0.43", "0.44", "0.45", "0.46", "0.47", "0.48", "0.49", "0.50"]);
});

test("rateToHundredths accepts only valid options", () => {
  assert.equal(rateToHundredths("0.42"), 42);
  assert.equal(rateToHundredths(0.5), 50);
  assert.equal(rateToHundredths("0.39"), null);
  assert.equal(rateToHundredths("0.51"), null);
  assert.equal(rateToHundredths(""), null);
  assert.equal(rateToHundredths("abc"), null);
});

test("calculations are exact (no float drift)", () => {
  // 0.45 * 3500 would be 1575.0000000000002 style territory in floats for some inputs
  const r = calc(3500, "0.45", "0.42");
  assert.deepEqual(r, { total: 157500, cost: 147000, profit: 10500 });
  assert.equal(formatPHP(r.total!), "₱1,575.00");
  assert.equal(formatPHP(r.cost!), "₱1,470.00");
  assert.equal(formatPHP(r.profit!), "₱105.00");
  const odd = calc(1999, "0.41", "0.43");
  assert.equal(odd.total, 81959); // 819.59
  assert.equal(odd.cost, 85957);
  assert.equal(odd.profit, -3998);
  assert.equal(formatPHP(odd.profit!), "-₱39.98");
});

test("calc returns nulls until inputs are valid", () => {
  assert.deepEqual(calc(null, "0.45", "0.42"), { total: null, cost: null, profit: null });
  assert.deepEqual(calc(1000, null, "0.42"), { total: null, cost: 42000, profit: null });
  assert.deepEqual(calc(10.5, "0.45", "0.42"), { total: null, cost: null, profit: null });
  assert.deepEqual(calc(0, "0.45", "0.42"), { total: null, cost: null, profit: null });
});

test("decimal strings from the DB format with 2 decimals", () => {
  assert.equal(decimalToCentavos("1575.00"), 157500);
  assert.equal(formatPHPDecimal("0"), "₱0.00");
  assert.equal(formatPHPDecimal("1234567.5"), "₱1,234,567.50");
  assert.equal(formatPHPDecimal(null), "₱0.00");
});

test("fetchable Mercari links: exact shapes only", () => {
  for (const good of [
    "https://jp.mercari.com/en/item/m12345678901",
    "https://jp.mercari.com/item/m12345678",
    "https://jp.mercari.com/shops/product/123qwerty345",
    "https://jp.mercari.com/en/shops/product/AbC_9-x",
  ]) {
    assert.ok(isFetchableMercariUrl(good), good);
  }
  for (const bad of [
    "http://jp.mercari.com/en/item/m123",
    "https://jp.mercari.com/en/item/m123/",
    "https://jp.mercari.com/en/item/m123?x=1",
    "https://jp.mercari.com/en/item/m123\n",
    "https://jp.mercari.com/en/item/123",
    "https://jp.mercari.com/ja/item/m123",
    "https://jp.mercari.com/en/en/item/m123",
    "https://jp.mercari.com/shops/product/",
    "https://jp.mercari.com/shops/product/abc/",
    "https://jp.mercari.com/shops/product/a b",
    "https://jp.mercari.com/shops/products/abc",
    "https://jp.mercari.com.evil.com/en/item/m123",
    "https://evil.com/?u=https://jp.mercari.com/en/item/m123",
    " https://jp.mercari.com/en/item/m123",
    "",
  ]) {
    assert.equal(isFetchableMercariUrl(bad), false, bad);
  }
});

test("any http(s) link is a valid item link (it just is not fetched)", () => {
  for (const ok of ["https://example.com/products/1", "http://shop.example.co.jp/a?b=1#c", "https://jp.mercari.com/en/item/m123?x=1", "https://jp.mercari.com/ja/item/m9"]) {
    assert.ok(isValidItemLink(ok), ok);
    assert.equal(isFetchableMercariUrl(ok), false, ok);
  }
  for (const bad of ["", "not a link", "example.com/x", "javascript:alert(1)", "ftp://example.com/x", "https://a b.com/x", "https://localhost/x", " https://example.com/x", "https://example.com/x\n", `https://example.com/${"a".repeat(2100)}`]) {
    assert.equal(isValidItemLink(bad), false, bad);
  }
});

test("photo URL is derived from the item ID (normal listings only)", () => {
  assert.equal(mercariImageUrl("https://jp.mercari.com/item/m5"), "https://static.mercdn.net/item/detail/orig/photos/m5_1.jpg");
  assert.equal(mercariImageUrl("https://jp.mercari.com/en/item/m56561393231"), "https://static.mercdn.net/item/detail/orig/photos/m56561393231_1.jpg");
  assert.equal(mercariImageUrl("https://jp.mercari.com/shops/product/abc123"), null);
  assert.equal(mercariImageUrl("https://example.com/item/m5"), null);
});

test("the dark theme is offered, marks the page dark and inverts the neutral scale", async () => {
  const { THEMES, themeCss, getTheme } = await import("@/lib/themes");
  const dark = getTheme("dark");
  assert.ok(THEMES.includes(dark) && dark.dark);
  assert.ok(themeCss(dark).includes("color-scheme:dark"));
  assert.ok(!themeCss(getTheme("default")).includes("color-scheme"));
  const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, v) => a + v, 0);
  assert.ok(lum(dark.neutrals![700]) > lum(dark.neutrals![50])); // text shades are lighter than surface tints
});

test("list thumbnails use Mercari's small photo path, only for the URL shape mercariImageUrl builds", () => {
  const orig = mercariImageUrl("https://jp.mercari.com/en/item/m56561393231")!;
  assert.equal(mercariThumbUrl(orig), "https://static.mercdn.net/thumb/photos/m56561393231_1.jpg");
  assert.equal(mercariThumbUrl(`${orig}?1598779743`), "https://static.mercdn.net/thumb/photos/m56561393231_1.jpg?1598779743");
  // Anything else is left alone: uploads, shop photos, pasted links, other hosts, lookalikes.
  assert.equal(mercariThumbUrl("https://abc.supabase.co/storage/v1/object/public/item-images/co/x.png"), null);
  assert.equal(mercariThumbUrl("https://static.mercdn.net/thumb/photos/m5_1.jpg"), null);
  assert.equal(mercariThumbUrl("https://static.mercdn.net/item/detail/orig/photos/m5_2.jpg"), null);
  assert.equal(mercariThumbUrl("https://static.mercdn.net.evil.com/item/detail/orig/photos/m5_1.jpg"), null);
  assert.equal(mercariThumbUrl("http://static.mercdn.net/item/detail/orig/photos/m5_1.jpg"), null);
  assert.equal(mercariThumbUrl("https://static.mercdn.net/item/detail/orig/photos/m5_1.jpg?x=1"), null);
});
