import { normalizeYouthActivityRow } from "@/lib/youth/youthActivity";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { YouthActivitiesClient } from "../YouthActivitiesClient";

export default async function BishopricYouthActivitiesPage() {
  const wardRoles = await fetchUserWardRoles();
  const wardsMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (!wardsMap.has(r.ward_id)) {
      wardsMap.set(r.ward_id, r.wards?.name ?? "Ward");
    }
  }
  const wards = [...wardsMap.entries()].map(([id, name]) => ({ id, name }));
  const wardId = wards[0]?.id ?? null;
  const wardName = wards[0]?.name ?? "Ward";

  if (!wardId) {
    return (
      <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
        You are not assigned to any ward yet.
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: activityRows, error: activitiesError }, { data: memberRows }] = await Promise.all([
    supabase
      .from("youth_activities")
      .select("*")
      .eq("ward_id", wardId)
      .order("activity_date", { ascending: true }),
    supabase
      .from("members")
      .select("id, name")
      .eq("ward_id", wardId)
      .order("name", { ascending: true }),
  ]);

  const activities = activitiesError
    ? []
    : (activityRows ?? []).map((row) =>
        normalizeYouthActivityRow(row as Record<string, unknown>),
      );

  return (
    <YouthActivitiesClient
      wardId={wardId}
      wardName={wardName}
      initialActivities={activities}
      members={(memberRows ?? []).map((m) => ({
        id: m.id as string,
        name: m.name as string,
      }))}
    />
  );
}
