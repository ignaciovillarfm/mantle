import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, section) => (
          <section key={section} className="rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, card) => (
                <div key={card} className="space-y-2 rounded-lg border border-border p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
