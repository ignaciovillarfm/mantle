import { AddMemberModal } from "./AddMemberModal";
import { buildMemberSacramentRollups } from "@/lib/members/sacramentEngagement";
import { fetchSacramentParticipationAssignmentLog } from "@/lib/members/sacramentParticipationLog";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function formatDelivered(v: boolean | null): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function formatResponse(v: string | null): string {
  if (!v) return "—";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatPrayerRole(role: "opening" | "closing" | null): string {
  if (role === "opening") return "Opening";
  if (role === "closing") return "Closing";
  return "—";
}

function truncate(s: string | null, max: number): string {
  if (!s) return "—";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export default async function MembersPage() {
  const supabase = await createClient();
  const wardRoles = await fetchUserWardRoles();
  const wardMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (r.wards?.name) wardMap.set(r.ward_id, r.wards.name);
  }
  const wards = [...wardMap.entries()].map(([id, name]) => ({ id, name }));
  const wardIds = [...wardMap.keys()];
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
    .select("id, name, is_youth, ward_id, wards ( name )")
    .order("name");

  const memberRows = (members ?? []).map((m) => ({
    id: m.id as string,
    ward_id: m.ward_id as string,
  }));
  const rollups = await buildMemberSacramentRollups(supabase, memberRows);
  const participationLog =
    wardIds.length > 0 ? await fetchSacramentParticipationAssignmentLog(supabase, wardIds) : [];

  const grouped = new Map<string, Record<string, unknown>[]>();
  for (const m of members ?? []) {
    const ward = (m.wards as { name?: string } | null)?.name ?? "Unknown Ward";
    const arr = grouped.get(ward) ?? [];
    arr.push(m as Record<string, unknown>);
    grouped.set(ward, arr);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="max-w-2xl text-sm text-foreground/55">
            For each person: latest saved sacrament talk and opening/closing prayer assignments (meeting date, pastoral
            notes, and whether they did it that Sunday). Edit on{" "}
            <Link href="/sacrament" className="text-foreground underline underline-offset-2 hover:text-foreground/80">
              Sacrament
            </Link>
            .
            {wards.length > 1 && wardForAddMember ? (
              <>
                {" "}
                New members from <span className="text-foreground/70">+</span> are added to{" "}
                <span className="font-medium text-foreground/80">{wardForAddMember.name}</span> (first ward
                alphabetically).
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center pt-1">
          <AddMemberModal ward={wardForAddMember} callingOptions={addMemberCallingOptions} />
        </div>
      </header>

      {Array.from(grouped.entries()).map(([wardName, wardMembers]) => (
        <section key={wardName} className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            {wardName}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-foreground/60">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th
                    className="px-4 py-2 font-medium"
                    title="Sacrament meeting date for their most recent assigned discourse (speaker slot)"
                  >
                    Last talk assignment
                  </th>
                  <th className="px-4 py-2 font-medium" title="Pastoral note tied to that talk assignment">
                    Talk notes
                  </th>
                  <th className="px-4 py-2 font-medium" title="Recorded on Sacrament: did they speak that Sunday?">
                    Spoke that day
                  </th>
                  <th
                    className="px-4 py-2 font-medium"
                    title="Sacrament meeting date for their most recent assigned opening or closing prayer"
                  >
                    Last prayer assignment
                  </th>
                  <th className="px-4 py-2 font-medium">Opening / closing</th>
                  <th className="px-4 py-2 font-medium" title="Pastoral note tied to that prayer assignment">
                    Prayer notes
                  </th>
                  <th className="px-4 py-2 font-medium" title="Recorded on Sacrament: did they offer the prayer that Sunday?">
                    Prayed that day
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wardMembers.map((m) => {
                  const id = m.id as string;
                  const r = rollups.get(id);
                  return (
                    <tr key={id} className="align-top">
                      <td className="px-4 py-3 font-medium">
                        {m.name as string}
                        {m.is_youth ? (
                          <span className="ml-1 text-foreground/50">· youth</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{r?.lastTalkSunday ?? "—"}</td>
                      <td className="max-w-[180px] px-4 py-3 text-foreground/80" title={r?.lastTalkNote ?? undefined}>
                        {truncate(r?.lastTalkNote ?? null, 72)}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {formatDelivered(r?.lastTalkDelivered ?? null)}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">{r?.lastPrayerSunday ?? "—"}</td>
                      <td className="px-4 py-3 text-foreground/80">
                        {formatPrayerRole(r?.lastPrayerRole ?? null)}
                      </td>
                      <td
                        className="max-w-[180px] px-4 py-3 text-foreground/80"
                        title={r?.lastPrayerNote ?? undefined}
                      >
                        {truncate(r?.lastPrayerNote ?? null, 72)}
                      </td>
                      <td className="px-4 py-3 text-foreground/80">
                        {formatDelivered(r?.lastPrayerFulfilled ?? null)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {(members ?? []).length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
          No members in the database yet. Use <span className="text-foreground/70">+</span> to add the first one.
        </div>
      )}

      {wardIds.length > 0 && (
        <section className="rounded-xl border border-border bg-surface">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
            Sacrament assignment log
          </h2>
          <p className="border-b border-border px-4 py-2 text-xs text-foreground/55">
            Every assigned slot (your wards); newest first.
          </p>
          {participationLog.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-foreground/50">No participation rows yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-foreground/60">
                    <th className="px-4 py-2 font-medium">Meeting date</th>
                    <th className="px-4 py-2 font-medium">Ward</th>
                    <th className="px-4 py-2 font-medium">Member</th>
                    <th className="px-4 py-2 font-medium">Slot</th>
                    <th className="px-4 py-2 font-medium">Topic</th>
                    <th className="px-4 py-2 font-medium">Response</th>
                    <th className="px-4 py-2 font-medium">Note</th>
                    <th className="px-4 py-2 font-medium">Fulfilled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {participationLog.map((row) => (
                    <tr key={`${row.wardId}-${row.meetingDate}-${row.slot}`} className="align-top">
                      <td className="px-4 py-2 text-foreground/80">{row.meetingDate}</td>
                      <td className="px-4 py-2 text-foreground/80">{wardMap.get(row.wardId) ?? row.wardId}</td>
                      <td className="px-4 py-2 font-medium">{row.memberName}</td>
                      <td className="px-4 py-2 text-foreground/80">{row.slotLabel}</td>
                      <td className="max-w-[200px] px-4 py-2 text-foreground/80" title={row.topic ?? undefined}>
                        {truncate(row.topic, 48)}
                      </td>
                      <td className="px-4 py-2 text-foreground/80">{formatResponse(row.responseStatus)}</td>
                      <td
                        className="max-w-[180px] px-4 py-2 text-foreground/80"
                        title={row.responseNote ?? undefined}
                      >
                        {truncate(row.responseNote, 40)}
                      </td>
                      <td className="px-4 py-2 text-foreground/80">{formatDelivered(row.fulfilled)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
