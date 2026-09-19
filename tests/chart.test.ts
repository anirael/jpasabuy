import { test } from "node:test";
import assert from "node:assert/strict";
import { compactPHP, formatPeriod, labelIndexes, niceTicks } from "../src/lib/chart.ts";
import { themeCss, THEMES, getTheme } from "../src/lib/themes.ts";

test("niceTicks are round, ordered and cover the data", () => {
  assert.deepEqual(niceTicks(0, 950, 4), [0, 250, 500, 750, 1000]);
  assert.deepEqual(niceTicks(-300, 900, 4), [-500, 0, 500, 1000]);
  assert.deepEqual(niceTicks(0, 0), [0, 1]);
  const t = niceTicks(0, 12345, 4);
  assert.ok(t[0] <= 0 && t[t.length - 1] >= 12345);
});

test("compactPHP", () => {
  assert.equal(compactPHP(750), "₱750");
  assert.equal(compactPHP(12500), "₱12.5K");
  assert.equal(compactPHP(2000), "₱2K");
  assert.equal(compactPHP(1_200_000), "₱1.2M");
  assert.equal(compactPHP(-500), "-₱500");
});

test("formatPeriod per bucket", () => {
  assert.equal(formatPeriod("2026-09-19", "day"), "Sep 19");
  assert.equal(formatPeriod("2026-09-19", "day", true), "Sep 19, 2026");
  assert.equal(formatPeriod("2026-09-01", "month"), "Sep 2026");
  assert.equal(formatPeriod("2026-01-01", "year"), "2026");
});

test("labelIndexes includes first and last and never exceeds max", () => {
  assert.deepEqual(labelIndexes(3, 6), [0, 1, 2]);
  const idx = labelIndexes(100, 5);
  assert.equal(idx[0], 0);
  assert.equal(idx[idx.length - 1], 99);
  assert.ok(idx.length <= 5);
});

test("every theme yields a complete CSS variable set", () => {
  assert.equal(THEMES.length, 5);
  for (const t of THEMES) {
    const css = themeCss(t);
    for (const v of ["--sidebar", "--accent", "--page", "--surface", "--ink", "--n50", "--n700", "--chart-line", "--ord-1", "--ord-3"]) {
      assert.ok(css.includes(`${v}:`), `${t.id} missing ${v}`);
    }
    assert.match(css, /^:root\{[-a-z0-9:; ]+\}$/, "only plain r g b channels");
  }
  assert.equal(getTheme("nope").id, "default");
  assert.equal(getTheme(undefined).id, "default");
  assert.ok(themeCss(getTheme("default")).includes("--accent:232 113 141"));
});
