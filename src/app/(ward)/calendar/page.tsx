import { CalendarClient } from "./CalendarClient";
import { formatMonthYear, normalizeActivityRow } from "@/lib/calendar/wardActivity";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ ward?: string; month?: string }>;
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

  const wardId =
    sp.ward && wardsMap.has(sp.ward) ? sp.ward : wards[0]?.id ?? null;

  if (!wardId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-foreground/70">
        You are not assigned to a ward yet. The ward calendar is ward-scoped.
      </div>
    );
  }

  const monthRaw = sp.month?.trim();
  const month =
    monthRaw && /^\d{4}-\d{2}$/.test(monthRaw) ? monthRaw : formatMonthYear(new Date());

  const [year, monthNum] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDay = new Date(year, monthNum, 0).getDate();
  const end = `${month}-${String(endDay).padStart(2, "0")}`;

  const supabase = await createClient();
  const [{ data: activityRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("ward_calendar_activities")
      .select("*")
      .eq("ward_id", wardId)
      .gte("activity_date", start)
      .lte("activity_date", end)
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false }),
    supabase
      .from("members")
      .select("id, name")
      .eq("ward_id", wardId)
      .order("name", { ascending: true }),
  ]);

  const initialActivities = (activityRows ?? []).map((row) =>
    normalizeActivityRow(row as Record<string, unknown>),
  );
  const members = (memberRows ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
  }));

  return (
    <CalendarClient
      wards={wards}
      wardId={wardId}
      month={month}
      initialActivities={initialActivities}
      members={members}
    />
  );
}
