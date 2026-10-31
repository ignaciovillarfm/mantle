import { Skeleton } from "@/components/ui/skeleton";
import { sundayStripCellClassName } from "@/lib/formControlStyles";
import { cn } from "@/lib/utils";

/** Form sections inside the white paper sheet. */
export function SacramentFormSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-5" aria-busy="true" aria-label="Loading form">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3 border border-neutral-900 bg-white p-4 sm:p-5">
          <Skeleton className="h-5 w-48 bg-neutral-200" />
          <Skeleton className="h-4 w-72 max-w-full bg-neutral-200" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-10 w-full bg-neutral-200" />
            <Skeleton className="h-10 w-full bg-neutral-200" />
          </div>
          <Skeleton className="h-24 w-full bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

/** Full-page chrome matching SacramentClient (header, agenda, date strip, paper). */
export function SacramentPageSkeleton() {
  return (
    <div
      className="flex h-[calc(100dvh-7rem)] max-h-[calc(100dvh-7rem)] flex-col gap-4 overflow-hidden text-foreground"
      aria-busy="true"
      aria-label="Loading form"
    >
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Skeleton className="h-9 w-[130px] rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 overflow-hidden lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        <nav
          className="hidden h-fit w-full self-start rounded-2xl border border-border bg-surface p-4 shadow-sm lg:block"
          aria-hidden
        >
          <Skeleton className="mb-3 h-3 w-16" />
          <ul className="flex flex-col gap-0.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-9 w-full rounded-lg" />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden">
          <div className="grid shrink-0 grid-cols-[auto_1fr_auto] items-center gap-x-1 sm:gap-x-2">
            <Skeleton className={cn(sundayStripCellClassName, "h-12 w-9 sm:h-14 sm:w-10")} />
            <Skeleton className={cn(sundayStripCellClassName, "h-12 w-full sm:h-14")} />
            <Skeleton className={cn(sundayStripCellClassName, "h-12 w-9 sm:h-14 sm:w-10")} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-sm border border-neutral-300 bg-white px-5 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.08)] sm:px-8 sm:py-8">
            <SacramentFormSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
