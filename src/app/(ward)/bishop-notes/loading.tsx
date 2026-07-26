import { Skeleton } from "@/components/ui/skeleton";

export default function BishopNotesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <Skeleton className="h-10 w-full max-w-md rounded-md" />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="space-y-2 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
