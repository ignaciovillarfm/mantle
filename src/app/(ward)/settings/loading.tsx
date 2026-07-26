import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, section) => (
        <section key={section} className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 2 }).map((_, row) => (
            <div key={row} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
