// Duplicate-customer detection. Pure, so the browser notice and the Server Actions share the same rules.

export type CustomerLite = { id: string; name: string; shipping_address: string };

export type CustomerMatch = {
  id: string;
  name: string;
  /** The names are the same (ignoring case, extra spaces and punctuation). */
  sameName: boolean;
  /** The shipping addresses are the same and not blank. */
  sameAddress: boolean;
  /** Same name AND same address: the same customer entered twice. These are rejected by the Server Actions. */
  exact: boolean;
};

/** Lowercase, punctuation to spaces, whitespace collapsed: "  Juan  DELA-Cruz. " -> "juan dela cruz". */
export function normalizeText(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const MIN_PARTIAL = 4; // "Al" should not match every customer containing "al"

/**
 * Existing customers that look like `name` / `address`. A customer matches when the names are equal, when one
 * name contains the other (e.g. "Maria Santos" vs "Maria Santos Jr."), or when the address is the same.
 * `excludeId` skips a customer being edited so it does not match itself.
 */
export function findSimilarCustomers(customers: CustomerLite[], name: string, address: string, excludeId?: string): CustomerMatch[] {
  const n = normalizeText(name);
  const a = normalizeText(address);
  if (n === "") return [];

  const out: CustomerMatch[] = [];
  for (const c of customers) {
    if (c.id === excludeId) continue;
    const cn = normalizeText(c.name);
    const ca = normalizeText(c.shipping_address);
    const sameName = cn === n;
    const partial = !sameName && n.length >= MIN_PARTIAL && cn.length >= MIN_PARTIAL && (cn.includes(n) || n.includes(cn));
    const sameAddress = a !== "" && ca === a;
    if (sameName || partial || sameAddress) out.push({ id: c.id, name: c.name, sameName, sameAddress, exact: sameName && (sameAddress || (a === "" && ca === "")) });
  }
  // Most alarming first: exact duplicates, then same name, then the rest.
  const rank = (m: CustomerMatch) => (m.exact ? 0 : m.sameName ? 1 : 2);
  return out.sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name));
}

export const DUPLICATE_CUSTOMER_ERROR = "A customer with this name and address already exists. Choose them from the list instead of creating a new one.";
