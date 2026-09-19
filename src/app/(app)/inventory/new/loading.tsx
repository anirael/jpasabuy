import { FormSkeleton, HeaderSkeleton, LoadingShell } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading form…">
      <HeaderSkeleton search={false} subtitle />
      <FormSkeleton fields={7} />
    </LoadingShell>
  );
}
