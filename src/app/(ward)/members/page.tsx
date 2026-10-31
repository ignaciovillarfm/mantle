import { AddMemberModal } from "./AddMemberModal";
import { MembersDirectoryClient, type MembersDirectoryRow } from "./MembersDirectoryClient";
import { buildMemberSacramentRollups } from "@/lib/members/sacramentEngagement";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";

function formatPrayerRole(role: "opening" | "closing" | null): string {
  if (role === "opening") return "Opening";
  if (role === "closing") return "Closing";
  return "—";
}

export default async function MembersPage() {
  const supabase = await createClient();
  const wardRoles = await fetchUserWardRoles();
  const wardMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (r.wards?.name) wardMap.set(r.ward_id, r.wards.name);
  }
  const wards = [...wardMap.entries()].map(([id, name]) => ({ id, name }));
  const sortedWardsByName = [...wards].sort((a, b) => a.name.localeCompare(b.name));
  const wardForAddMember = sortedWardsByName[0] ?? null;
  const { data: addMemberCallings } = wardForAddMember
    ? await supabase
        .from("calling_positions")
        .select("id, title, sort_order")
        .eq("ward_id", wardForAddMember.id)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true })
    : { data: [] as { id: string; title: string; sort_order: number }[] };
  const addMemberCallingOptions = (addMemberCallings ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
  }));

  const { data: members } = await supabase
    .from("members")
    .select("id, name, is_youth, gender, birth_date, phone, email, ward_id, wards ( name )")
    .order("name");

  const memberRows = (members ?? []).map((m) => ({
    id: m.id as string,
    ward_id: m.ward_id as string,
  }));
  const rollups = await buildMemberSacramentRollups(supabase, memberRows);

  const grouped = new Map<string, MembersDirectoryRow[]>();
  for (const m of members ?? []) {
    const ward = (m.wards as { name?: string } | null)?.name ?? "Unknown Ward";
    const id = m.id as string;
    const r = rollups.get(id);
    const arr = grouped.get(ward) ?? [];
    arr.push({
      id,
      name: m.name as string,
      is_youth: Boolean(m.is_youth),
      gender: (m.gender as string | null) ?? null,
      birth_date: (m.birth_date as string | null) ?? null,
      phone: (m.phone as string | null) ?? null,
      email: (m.email as string | null) ?? null,
      wardName: ward,
      lastTalkSunday: r?.lastTalkSunday ?? null,
      lastTalkNote: r?.lastTalkNote ?? null,
      lastTalkDelivered: r?.lastTalkDelivered ?? null,
      lastPrayerSunday: r?.lastPrayerSunday ?? null,
      lastPrayerRole: formatPrayerRole(r?.lastPrayerRole ?? null),
      lastPrayerNote: r?.lastPrayerNote ?? null,
      lastPrayerFulfilled: r?.lastPrayerFulfilled ?? null,
    });
    grouped.set(ward, arr);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <AddMemberModal ward={wardForAddMember} callingOptions={addMemberCallingOptions} />
      </header>

      {Array.from(grouped.entries()).map(([wardName, wardMembers]) => (
        <MembersDirectoryClient key={wardName} wardName={wardName} members={wardMembers} />
      ))}
      {(members ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
          No members in the database yet. Use <span className="text-foreground/70">+</span> to add
          the first one.
        </div>
      )}
    </div>
  );
}
