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
