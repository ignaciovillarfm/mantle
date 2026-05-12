export function PastProgramsFallback() {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">Past programs</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {["w-32", "w-40", "w-36", "w-28"].map((w, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className={`inline-block h-4 animate-pulse rounded bg-foreground/10 ${w}`} />
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-foreground/10" />
          </li>
        ))}
      </ul>
    </section>
  );
}
