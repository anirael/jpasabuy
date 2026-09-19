import { HeaderSkeleton, LoadingShell, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading clients…">
      <HeaderSkeleton action />
      <TableSkeleton rows={7} cols={2} />
    </LoadingShell>
  );
}
