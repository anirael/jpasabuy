import { HeaderSkeleton, ItemRowsSkeleton, LoadingShell, TabsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading inventory…">
      <HeaderSkeleton action />
      <TabsSkeleton />
      <ItemRowsSkeleton rows={7} />
    </LoadingShell>
  );
}
