import { HeaderSkeleton, ItemRowsSkeleton, LoadingShell, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading customer…">
      <HeaderSkeleton search={false} subtitle />
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <div className="card space-y-4 p-5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
        <div>
          <Skeleton className="mb-4 h-5 w-24" />
          <ItemRowsSkeleton rows={4} />
        </div>
      </div>
    </LoadingShell>
  );
}
