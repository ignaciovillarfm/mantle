import { SacramentRolePoolClient } from "./SacramentRolePoolClient";
import { loadSacramentRolePool } from "../loadSacramentState";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function SacramentRolePoolSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ward?: string }>;
}) {
  const sp = await searchParams;
  const wardRoles = await fetchUserWardRoles();
  const wardsMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (!wardsMap.has(r.ward_id)) {
      wardsMap.set(r.ward_id, r.wards?.name ?? "Ward");
    }
  }
  const wards = [...wardsMap.entries()].map(([id, name]) => ({ id, name }));
  const wardId = sp.ward && wardsMap.has(sp.ward) ? sp.ward : wards[0]?.id ?? null;

  if (!wardId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-foreground/70">
        You are not assigned to a ward yet.
      </div>
    );
  }

  const wardName = wardsMap.get(wardId) ?? "Ward";
  const supabase = await createClient();
  const [{ data: members }, rolePool, { data: callingPositions }] = await Promise.all([
    supabase.from("members").select("id, name").eq("ward_id", wardId).order("name"),
    loadSacramentRolePool(wardId),
    supabase
      .from("calling_positions")
      .select("id, title, sort_order")
      .eq("ward_id", wardId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);
  const callingOptions = (callingPositions ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8 text-foreground">
      {wards.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {wards.map((w) => (
            <Link
              key={w.id}
              href={`/sacrament/settings?ward=${encodeURIComponent(w.id)}`}
              className={`rounded-lg border px-3 py-2 text-sm ${
                w.id === wardId
                  ? "border-foreground/30 bg-surface font-medium"
                  : "border-border bg-background hover:bg-surface-hover"
              }`}
            >
              {w.name}
            </Link>
          ))}
        </div>
      ) : null}

      <SacramentRolePoolClient
        wardId={wardId}
        wardName={wardName}
        sacramentHref={`/sacrament?ward=${encodeURIComponent(wardId)}`}
        members={(members ?? []).map((m) => ({ id: m.id as string, name: m.name as string }))}
        initialRolePool={rolePool}
        callingOptions={callingOptions}
      />
    </div>
  );
}

