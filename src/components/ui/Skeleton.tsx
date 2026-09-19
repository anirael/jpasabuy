// Skeleton placeholders shown by the loading.tsx files while a module's data loads.
// They mirror the real layouts (header, filters, tables, forms) so nothing jumps when content arrives.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-lg bg-neutral-200/80 motion-safe:animate-pulse ${className}`} />;
}

/** Wraps a skeleton page: announces loading to screen readers. */
export function LoadingShell({ children, label = "Loading…" }: { children: React.ReactNode; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function HeaderSkeleton({ search = true, action = false, subtitle = false }: { search?: boolean; action?: boolean; subtitle?: boolean }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mb-8">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-9 w-56 max-w-full rounded-xl sm:h-10 sm:w-72" />
        {subtitle && <Skeleton className="h-4 w-48 max-w-full" />}
      </div>
      <div className="flex w-full items-center gap-3 sm:w-auto">
        {search && <Skeleton className="h-11 w-full rounded-full sm:w-64" />}
        {action && <Skeleton className="h-11 w-28 shrink-0 rounded-full" />}
      </div>
    </div>
  );
}

export function TabsSkeleton() {
  return <Skeleton className="mb-5 h-11 w-full rounded-full" />;
}

/** Rows with a thumbnail, used for item lists. */
export function ItemRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="card flex items-center gap-4 p-3 sm:p-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" />
        </li>
      ))}
    </ul>
  );
}

/** Simple two-column table body (e.g. customers). */
export function TableSkeleton({ rows = 6, cols = 2 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="flex gap-6 bg-neutral-100/70 px-4 py-4">
        {Array.from({ length: cols }, (_, c) => (
          <Skeleton key={c} className="h-4 w-28" />
        ))}
      </div>
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6 px-4 py-4">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={`h-4 ${c === 0 ? "w-40" : "w-56 max-w-[50%]"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-11 w-32 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="hidden h-48 rounded-2xl lg:block" />
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-32" />
          <Skeleton className="mt-3 h-3 w-40 max-w-full" />
        </div>
      ))}
    </div>
  );
}
