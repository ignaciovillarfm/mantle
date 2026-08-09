import { Skeleton } from "@/components/ui/skeleton";

export default function YouthClassesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-44 rounded-md" />
      </div>

      {Array.from({ length: 2 }).map((_, group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="space-y-3 px-4 py-4">
                <Skeleton className="h-4 w-36" />
                <div className="flex gap-2">
                  <Skeleton className="h-14 w-40 rounded-lg" />
                  <Skeleton className="h-14 w-40 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
