import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Form section cards — used while switching Sundays and inside the route loading UI. */
export function SacramentFormSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading form">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="gap-0 py-7">
          <CardContent className="space-y-4 px-7">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 max-w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Full-page chrome matching SacramentClient (header, agenda, Sunday strip, form cards). */
export function SacramentPageSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-8 pb-8 text-foreground"
      aria-busy="true"
      aria-label="Loading form"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <nav className="mb-4 hidden lg:mb-0 lg:block" aria-hidden>
          <Skeleton className="mb-3 h-4 w-16" />
          <ul className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-10 w-full rounded-lg" />
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-8">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1 sm:gap-x-2">
            <Skeleton className="h-14 w-9 rounded-md sm:h-16 sm:w-10" />
            <Skeleton className="h-14 w-full rounded-md sm:h-16" />
            <Skeleton className="h-14 w-9 rounded-md sm:h-16 sm:w-10" />
          </div>

          <SacramentFormSkeleton />
        </div>
      </div>
    </div>
  );
}
