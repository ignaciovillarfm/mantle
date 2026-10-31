import { createClient } from "@/lib/supabase/server";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import Link from "next/link";
import { ImportCallingsClient } from "./ImportCallingsClient";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/callings", label: "Current callings" },
  { href: "/callings/proposed", label: "Proposed callings" },
  { href: "/callings/import", label: "Import PDF", active: true },
] as const;

export default async function CallingsImportPage() {
  await createClient();
  const wardRoles = await fetchUserWardRoles();
  const wardMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (r.wards?.name) wardMap.set(r.ward_id, r.wards.name);
  }
  const wards = [...wardMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const defaultWardId = wards[0]?.id ?? null;

  return (
    <div className="space-y-4">
      <nav className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1 text-sm">
        {tabs.map((t) =>
          "active" in t && t.active ? (
            <span
              key={t.href}
              className="rounded-lg bg-background px-3 py-1.5 font-medium text-foreground shadow-sm"
            >
              {t.label}
            </span>
          ) : (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-foreground/65 transition-colors hover:bg-background/70 hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          ),
        )}
      </nav>
      <ImportCallingsClient wards={wards} defaultWardId={defaultWardId} />
    </div>
  );
}
