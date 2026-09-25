// Search text for the list pages, turned into PostgREST filters without letting user input change the filter itself.
//
// The old in-memory search was a plain case-insensitive "contains". PostgREST's like/ilike can't express that exactly:
// it rewrites every `*` into a `%` wildcard *before* LIKE escaping applies, so a literal `*` can never be matched.
// The regex operator has no such alias, so the text is escaped and matched with `imatch` (case-insensitive `~*`).

/** Longest search text the list pages accept. */
export const MAX_SEARCH_LENGTH = 100;

/** The ?q= value as the pages use it: trimmed, capped, and without NUL characters (Postgres rejects them). */
export function cleanSearch(raw: string | undefined): string {
  return (raw ?? "").replace(/\u0000/g, "").trim().slice(0, MAX_SEARCH_LENGTH);
}

/**
 * A Postgres regex that matches `text` literally. Every ASCII punctuation character gets a backslash, which in a
 * Postgres regex always means "this exact character"; letters, digits, spaces and non-ASCII text are left alone.
 */
export function escapeRegex(text: string): string {
  return text.replace(/[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/g, "\\$&");
}

/**
 * Quotes a value for use inside a PostgREST `or(...)` / `and(...)` list, where an unquoted `,` `(` `)` would end the
 * value and start a new condition. Inside the quotes only `\` and `"` are special.
 */
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/[\\"]/g, "\\$&")}"`;
}

/** Filter value for `.filter(column, "imatch", value)`: rows where the column contains `text`, ignoring case. */
export function containsRegex(text: string): string {
  return escapeRegex(text);
}

/**
 * The argument for `.or(...)`: rows where any of `columns` contains `text` (case-insensitive).
 * A column can be a related table's column such as `customers.name` (the select needs `customers!inner(...)`).
 */
export function orContains(columns: string[], text: string): string {
  const value = quoteFilterValue(containsRegex(text));
  return columns.map((c) => `${c}.imatch.${value}`).join(",");
}
