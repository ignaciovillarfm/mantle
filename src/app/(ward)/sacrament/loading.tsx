export default function SacramentLoading() {
  return (
    <div className="space-y-8 p-4 text-foreground">
      <div className="h-8 w-64 animate-pulse rounded bg-foreground/10" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded bg-foreground/10" />
      <div className="grid gap-4 rounded-xl border border-border bg-surface p-4">
        <div className="h-10 w-40 animate-pulse rounded bg-foreground/10" />
        <div className="h-24 animate-pulse rounded-lg bg-foreground/10" />
      </div>
    </div>
  );
}
