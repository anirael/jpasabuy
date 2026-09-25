// Pagination shared by the list pages: the page number and page size live in the URL (?page=2&perPage=50).

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type Paging = {
  page: number;
  perPage: number;
  totalPages: number;
  total: number;
  /** Slice bounds into the full list. */
  start: number;
  end: number;
};

function positiveInt(v: string | undefined): number | null {
  return v !== undefined && /^\d{1,6}$/.test(v) && Number(v) > 0 ? Number(v) : null;
}

/** Reads ?page / ?perPage and clamps them so a stale link (e.g. page 9 after deleting items) still shows something. */
export function getPaging(sp: { page?: string; perPage?: string }, total: number): Paging {
  const asked = positiveInt(sp.perPage);
  const perPage = asked && (PAGE_SIZES as readonly number[]).includes(asked) ? asked : DEFAULT_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(positiveInt(sp.page) ?? 1, totalPages);
  const start = (page - 1) * perPage;
  return { page, perPage, totalPages, total, start, end: Math.min(start + perPage, total) };
}

/** Page numbers to show, with null for a gap: 1 … 4 5 [6] 7 8 … 20 */
export function pageWindow(page: number, totalPages: number): (number | null)[] {
  const keep = new Set([1, totalPages, page, page - 1, page + 1, page - 2, page + 2].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(sorted[i - 1] + 1 === p - 1 ? p - 1 : null);
    out.push(p);
  });
  return out;
}

/** The chosen page size as a query param to carry through the search box and tabs (only when it is a valid, non-default size). */
export function keepPerPage(perPage: string | undefined): Record<string, string> {
  const { perPage: n } = getPaging({ perPage }, 0);
  return n !== DEFAULT_PAGE_SIZE ? { perPage: String(n) } : {};
}

/** Inclusive row range for `.range(from, to)`. */
export function pageRange(paging: Paging): { from: number; to: number } {
  return { from: paging.start, to: paging.start + paging.perPage - 1 };
}

type PageQuery<T> = (range: { from: number; to: number }) => PromiseLike<{ data: T[] | null; count: number | null; error: unknown }>;

/** PostgREST answers a range that starts past the last row with HTTP 416 and this code (and no row count). */
const RANGE_NOT_SATISFIABLE = "PGRST103";

/**
 * Loads one page from the database. The total is only known once a query answers, so the page in the URL is queried as
 * asked; when it turns out to be past the end (e.g. page 9 after customers were deleted) it is clamped and queried
 * again, so the user still sees rows. `fetchPage` must ask the database for an exact count.
 */
export async function loadPage<T>(sp: { page?: string; perPage?: string }, fetchPage: PageQuery<T>): Promise<{ rows: T[]; paging: Paging; failed: boolean }> {
  const failed = { rows: [] as T[], paging: getPaging(sp, 0), failed: true };
  let held = getPaging(sp, Number.MAX_SAFE_INTEGER); // the page `res` was asked for (not clamped yet)
  let res = await fetchPage(pageRange(held));
  if ((res.error as { code?: unknown } | null)?.code === RANGE_NOT_SATISFIABLE) {
    // Past the end, and the error carries no count: page 1 always exists and brings the count with it.
    held = getPaging({ perPage: sp.perPage }, Number.MAX_SAFE_INTEGER);
    res = await fetchPage(pageRange(held));
  }
  if (res.error) return failed;
  const paging = getPaging(sp, res.count ?? res.data?.length ?? 0);
  if (paging.page !== held.page) {
    res = await fetchPage(pageRange(paging));
    if (res.error) return failed;
  }
  return { rows: res.data ?? [], paging, failed: false };
}
