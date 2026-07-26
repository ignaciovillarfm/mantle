import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-7 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }).map((_, day) => (
            <div key={day} className="px-2 py-2">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, cell) => (
            <div key={cell} className="min-h-20 space-y-2 border-b border-r border-border p-2">
              <Skeleton className="h-3 w-5" />
              {cell % 4 === 0 ? <Skeleton className="h-4 w-full" /> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
