"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, pageWindow, type Paging } from "@/lib/pagination";

/**
 * Page links + a "per page" selector. Page and size live in the URL, so a page can be bookmarked or shared and the
 * back button works. `params` are the other query params to keep (status, q); changing the size goes back to page 1.
 */
export function Pagination({ paging, basePath, params = {} }: { paging: Paging; basePath: string; params?: Record<string, string> }) {
  const router = useRouter();
  const { page, perPage, totalPages, total, start, end } = paging;

  const href = (p: number, size = perPage) => {
    const qs = new URLSearchParams(params);
    if (size !== DEFAULT_PAGE_SIZE) qs.set("perPage", String(size));
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  if (total === 0) return null;

  const step = "inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm font-medium transition";
  const idle = `${step} text-neutral-600 hover:bg-neutral-100`;
  const disabled = `${step} cursor-not-allowed text-neutral-300`;

  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-neutral-500">
        <span>
          Showing {start + 1}–{end} of {total}
        </span>
        <label className="inline-flex items-center gap-2">
          Per page
          <select
            value={perPage}
            onChange={(e) => router.push(href(1, Number(e.target.value)))}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {totalPages > 1 && (
        <ul className="flex flex-wrap items-center justify-center gap-1">
          <li>
            {page > 1 ? (
              <Link href={href(page - 1)} className={idle} aria-label="Previous page">
                Prev
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true">
                Prev
              </span>
            )}
          </li>
          {pageWindow(page, totalPages).map((p, i) => (
            <li key={p ?? `gap${i}`}>
              {p === null ? (
                <span className={`${step} text-neutral-400`} aria-hidden="true">
                  …
                </span>
              ) : p === page ? (
                <span className={`${step} bg-accent text-white`} aria-current="page">
                  {p}
                </span>
              ) : (
                <Link href={href(p)} className={idle} aria-label={`Page ${p}`}>
                  {p}
                </Link>
              )}
            </li>
          ))}
          <li>
            {page < totalPages ? (
              <Link href={href(page + 1)} className={idle} aria-label="Next page">
                Next
              </Link>
            ) : (
              <span className={disabled} aria-disabled="true">
                Next
              </span>
            )}
          </li>
        </ul>
      )}
    </nav>
  );
}
