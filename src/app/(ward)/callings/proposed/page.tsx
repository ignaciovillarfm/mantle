import { createClient } from "@/lib/supabase/server";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { getNextCallingStatus } from "@/lib/callingStatus";
import { CallingsClient } from "../CallingsClient";
import Link from "next/link";

export default async function ProposedCallingsPage() {
  const supabase = await createClient();
  const wardRoles = await fetchUserWardRoles();
  const wardMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (r.wards?.name) wardMap.set(r.ward_id, r.wards.name);
  }
  const wards = [...wardMap.entries()].map(([id, name]) => ({ id, name }));
  const wardIds = [...wardMap.keys()];
  const sortedWards = [...wards].sort((a, b) => a.name.localeCompare(b.name));
  const defaultWardId = sortedWards[0]?.id ?? null;

  const { data: callings } = await supabase
    .from("callings")
    .select("id, ward_id, name, status, member_id, members ( name ), wards ( name )")
    .neq("status", "Set Apart")
    .order("created_at", { ascending: false });

  let positions: { id: string; ward_id: string; title: string; sort_order: number }[] = [];
  let members: { id: string; ward_id: string; name: string }[] = [];

  if (wardIds.length > 0) {
    const [{ data: posRows }, { data: memRows }] = await Promise.all([
      supabase
        .from("calling_positions")
        .select("id, ward_id, title, sort_order")
        .in("ward_id", wardIds)
        .order("sort_order", { ascending: true }),
      supabase.from("members").select("id, ward_id, name").in("ward_id", wardIds).order("name"),
    ]);
    positions = (posRows ?? []) as typeof positions;
    members = (memRows ?? []) as typeof members;
  }

  const rows = (callings ?? []).map((c) => {
    const raw = c as {
      id: string;
      ward_id: string;
      name: string;
      status: string;
      member_id: string;
      members: { name: string } | { name: string }[] | null;
      wards: { name: string } | { name: string }[] | null;
    };
    const membersEmbed =
      raw.members == null ? null : Array.isArray(raw.members) ? raw.members[0] ?? null : raw.members;
    const wardsEmbed =
      raw.wards == null ? null : Array.isArray(raw.wards) ? raw.wards[0] ?? null : raw.wards;
    return {
      id: raw.id,
      ward_id: raw.ward_id,
      wardName: wardsEmbed?.name ?? "—",
      name: raw.name,
      status: raw.status,
      member_id: raw.member_id,
      members: membersEmbed,
      nextStatus: getNextCallingStatus(raw.status),
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/callings" className="text-foreground/70 underline underline-offset-2 hover:text-foreground">
          Current callings
        </Link>
        <span className="rounded-md bg-foreground/10 px-2 py-1 font-medium text-foreground">
          Proposed callings
        </span>
      </div>
      <CallingsClient
        wards={wards}
        defaultWardId={defaultWardId}
        positions={positions}
        members={members}
        callings={rows}
        title="Proposed callings"
        showAddModal
        allowStatusAdvance
        allowDeleteProposed
        addModalInitialStatus="Proposed"
        addModalButtonLabel="Add proposed calling"
        addModalTitle="Add proposed calling"
      />
    </div>
  );
}
