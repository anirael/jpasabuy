import { FormSkeleton, HeaderSkeleton, LoadingShell } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <LoadingShell label="Loading form…">
      <HeaderSkeleton search={false} />
      <div className="max-w-xl">
        <FormSkeleton fields={2} />
      </div>
    </LoadingShell>
  );
}
