import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_SEARCH_LENGTH, cleanSearch, containsRegex, escapeRegex, orContains, quoteFilterValue } from "@/lib/search";

/** What the escaped pattern means to a regex engine (JS and Postgres agree for fully escaped literal text). */
const matches = (pattern: string, text: string) => new RegExp(pattern, "i").test(text);

test("cleanSearch trims, caps the length and drops NUL characters", () => {
  assert.equal(cleanSearch(undefined), "");
  assert.equal(cleanSearch("  maria  "), "maria");
  assert.equal(cleanSearch("a\u0000b"), "ab");
  assert.equal(cleanSearch("x".repeat(500)).length, MAX_SEARCH_LENGTH);
});

test("escapeRegex backslashes every ASCII punctuation character and leaves letters, digits, spaces and Japanese alone", () => {
  assert.equal(escapeRegex("Maria Santos 123"), "Maria Santos 123");
  assert.equal(escapeRegex("日本 ÄÖ"), "日本 ÄÖ");
  assert.equal(escapeRegex("a.b*c"), "a\\.b\\*c");
  assert.equal(escapeRegex("50%_"), "50\\%\\_");
  assert.equal(escapeRegex("\\"), "\\\\");
  assert.equal(escapeRegex("(x),[y]|{z}^$?+"), "\\(x\\)\\,\\[y\\]\\|\\{z\\}\\^\\$\\?\\+");
});

test("an escaped search only matches the literal text, whatever characters it contains", () => {
  for (const text of ["a.b", "a*b", "50% off", "a_b", "a\\b", "(x), [y]", 'say "hi"', "^$|?+{1}", "*"]) {
    assert.ok(matches(containsRegex(text), `before ${text} after`), text);
  }
  // Nothing in the input acts as a wildcard or an operator.
  assert.ok(!matches(containsRegex("a.b"), "axb"));
  assert.ok(!matches(containsRegex("*"), "anything"));
  assert.ok(!matches(containsRegex("a_b"), "axb"));
  assert.ok(!matches(containsRegex("50%"), "50 off"));
  assert.ok(!matches(containsRegex("a|b"), "b"));
  assert.ok(!matches(containsRegex(".*"), "abc"));
});

test("it is a case-insensitive contains, like the old in-memory search", () => {
  assert.ok(matches(containsRegex("MARIA"), "Maria Santos"));
  assert.ok(matches(containsRegex("ria s"), "Maria Santos"));
  assert.ok(!matches(containsRegex("santos maria"), "Maria Santos"));
});

test("quoteFilterValue wraps the value in quotes and escapes only backslash and double quote", () => {
  assert.equal(quoteFilterValue("plain"), '"plain"');
  assert.equal(quoteFilterValue("a,b (c)"), '"a,b (c)"');
  assert.equal(quoteFilterValue('say "hi"'), '"say \\"hi\\""');
  assert.equal(quoteFilterValue("a\\b"), '"a\\\\b"');
});

test("orContains builds one condition per column and cannot be broken out of by the search text", () => {
  assert.equal(orContains(["notes", "category"], "gift"), 'notes.imatch."gift",category.imatch."gift"');
  // A comma, parenthesis or quote in the text stays inside the quoted value, so it cannot add a condition.
  const out = orContains(["notes", "category"], 'x"),category.eq.(');
  const value = quoteFilterValue(escapeRegex('x"),category.eq.('));
  assert.equal(out, `notes.imatch.${value},category.imatch.${value}`);
  assert.equal(out.split(".imatch.").length, 3);
  // Every `"` inside the value is preceded by a backslash: only the surrounding pair is unescaped.
  assert.equal(value.slice(1, -1).replace(/\\./g, "").includes('"'), false);
});
