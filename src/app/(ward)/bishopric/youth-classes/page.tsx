import { normalizeYouthClassAssignmentRow } from "@/lib/youth/youthClassAssignment";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { YouthClassesClient } from "../YouthClassesClient";

export default async function BishopricYouthClassesPage() {
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
  const [{ data: assignmentRows, error: assignmentsError }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("youth_class_assignments")
        .select("*")
        .eq("ward_id", wardId)
        .order("sunday_date", { ascending: true }),
      supabase
        .from("members")
        .select("id, name, is_youth")
        .eq("ward_id", wardId)
        .order("name", { ascending: true }),
    ]);

  if (assignmentsError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-8 text-center text-sm text-foreground/70">
        Youth class assignments could not be loaded: {assignmentsError.message}
      </div>
    );
  }

  return (
    <YouthClassesClient
      wardId={wardId}
      wardName={wardName}
      initialAssignments={(assignmentRows ?? []).map((row) =>
        normalizeYouthClassAssignmentRow(row as Record<string, unknown>),
      )}
      members={(memberRows ?? []).map((m) => ({
        id: m.id as string,
        name: m.name as string,
        is_youth: Boolean(m.is_youth),
      }))}
    />
  );
}
