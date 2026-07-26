import { Skeleton } from "@/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
      </header>

      {Array.from({ length: 2 }).map((_, section) => (
        <section key={section} className="rounded-xl border border-border bg-surface">
          <Skeleton className="mx-4 my-3 h-5 w-48" />
          <div className="divide-y divide-border border-t border-border">
            {Array.from({ length: 5 }).map((_, row) => (
              <div key={row} className="flex items-center justify-between gap-4 px-4 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
