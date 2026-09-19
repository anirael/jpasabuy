import { HeaderSkeleton, LoadingShell, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading settings…">
      <HeaderSkeleton search={false} subtitle />
      <div className="max-w-3xl space-y-8">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    </LoadingShell>
  );
}
