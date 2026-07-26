import { Skeleton } from "@/components/ui/skeleton";

export default function SacramentSettingsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, section) => (
          <section key={section} className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <Skeleton className="h-5 w-44" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, row) => (
                <div key={row} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-8 w-24 rounded-md" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
