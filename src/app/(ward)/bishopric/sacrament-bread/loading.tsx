import { Skeleton } from "@/components/ui/skeleton";

export default function SacramentBreadLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      {Array.from({ length: 2 }).map((_, group) => (
        <div key={group} className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between gap-4 px-4 py-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
