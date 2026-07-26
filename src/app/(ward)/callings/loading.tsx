import { Skeleton } from "@/components/ui/skeleton";

export default function CallingsLoading() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-36 rounded-md" />
        <Skeleton className="h-8 w-36 rounded-md" />
      </div>
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
