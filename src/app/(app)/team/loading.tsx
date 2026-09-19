import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading team…">
      <HeaderSkeleton search={false} subtitle />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-neutral-100 px-4 py-4 last:border-0">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </LoadingShell>
  );
}
