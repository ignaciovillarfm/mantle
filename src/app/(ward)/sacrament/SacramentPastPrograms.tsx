import Link from "next/link";
import { loadSacramentHistory } from "./loadSacramentState";

export async function SacramentPastPrograms({ wardId }: { wardId: string }) {
  const history = await loadSacramentHistory(wardId, 52);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-lg font-semibold">Past programs</h2>
      <ul className="mt-3 divide-y divide-border text-sm">
        {history.length === 0 ? (
          <li className="py-2 text-foreground/50">No saved programs yet.</li>
        ) : (
          history.map((row) => (
            <li key={`${row.id}:${row.date}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-medium">{row.date}</span>
              <span className="text-foreground/70">
                {[row.theme, row.presidingName].filter(Boolean).join(" · ") || "—"}
              </span>
              <Link
                href={`/sacrament?ward=${encodeURIComponent(wardId)}&date=${encodeURIComponent(row.date)}`}
                className="text-sm font-medium text-foreground underline underline-offset-2 hover:opacity-90"
              >
                Open
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
