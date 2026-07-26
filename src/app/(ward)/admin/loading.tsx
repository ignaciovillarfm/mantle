import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </section>
    </div>
  );
}
