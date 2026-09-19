import { HeaderSkeleton, LoadingShell, Skeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading dashboard…">
      <HeaderSkeleton subtitle />
      <div className="card mb-6 space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-11 w-72 max-w-full rounded-xl" />
      </div>
      <StatCardsSkeleton />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="card p-5">
          <Skeleton className="h-5 w-32" />
          <div className="mt-6 flex justify-center">
            <Skeleton className="h-[190px] w-[190px] rounded-full" />
          </div>
        </div>
        <div className="card p-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-6 h-[240px] w-full rounded-xl" />
        </div>
      </div>
    </LoadingShell>
  );
}
