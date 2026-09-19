import { HeaderSkeleton, ItemRowsSkeleton, LoadingShell } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell>
      <HeaderSkeleton />
      <ItemRowsSkeleton />
    </LoadingShell>
  );
}
