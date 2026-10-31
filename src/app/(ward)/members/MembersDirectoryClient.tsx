"use client";

import { EditMemberModal, type EditableMember } from "./EditMemberModal";
import { MemberDetailSheet } from "./MemberDetailSheet";
import type { MembersDirectoryRow } from "./memberDirectoryTypes";
import { useWardCachedState } from "@/hooks/useWardCachedState";
import { filterMembersByQuery } from "@/lib/members/memberSearch";
import { wardPageKeys } from "@/lib/wardPageCache";
import { useMemo, useState } from "react";

export type { MembersDirectoryRow };

function formatPrayerCell(sunday: string | null, role: string): string {
  if (!sunday) return "—";
  if (!role || role === "—") return sunday;
  return `${sunday} · ${role}`;
}

export function MembersDirectoryClient({
  wardName,
  members,
}: {
  wardName: string;
  members: MembersDirectoryRow[];
}) {
  const [rows, setRows] = useWardCachedState<MembersDirectoryRow[]>(
    [...wardPageKeys.members, wardName],
    members,
  );
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableMember | null>(null);
  const [selected, setSelected] = useState<MembersDirectoryRow | null>(null);
  const filtered = useMemo(
    () =>
      filterMembersByQuery(
        rows.map((m) => ({ id: m.id, name: m.name })),
        query,
      ).map((m) => rows.find((row) => row.id === m.id)!),
    [rows, query],
  );

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          {wardName}
        </h2>
        <label className="relative block w-full max-w-xs">
          <span className="sr-only">Search members</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search members…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground/55">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Last talk</th>
              <th className="px-4 py-2.5 font-medium">Last prayer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="cursor-pointer transition-colors hover:bg-muted/30"
                onClick={() => setSelected(m)}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">{m.name}</span>
                  {m.is_youth ? (
                    <span className="ml-1.5 text-xs text-foreground/45">Youth</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-foreground/75">
                  {m.phone ? (
                    <a
                      href={`tel:${m.phone.replace(/[^\d+]/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[var(--accent-primary)] underline-offset-2 hover:underline"
                    >
                      {m.phone}
                    </a>
                  ) : (
                    <span className="text-foreground/35">—</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-foreground/75">
                  {m.lastTalkSunday ?? <span className="text-foreground/35">—</span>}
                </td>
                <td className="px-4 py-3 text-foreground/75">
                  {m.lastPrayerSunday ? (
                    formatPrayerCell(m.lastPrayerSunday, m.lastPrayerRole)
                  ) : (
                    <span className="text-foreground/35">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditMemberModal
        member={editing}
        onClose={() => setEditing(null)}
        onSaved={(next) => {
          setRows((prev) =>
            prev.map((m) =>
              m.id === next.id ? { ...m, name: next.name, is_youth: next.is_youth } : m,
            ),
          );
          setSelected((sel) =>
            sel && sel.id === next.id
              ? { ...sel, name: next.name, is_youth: next.is_youth }
              : sel,
          );
        }}
      />

      <MemberDetailSheet
        member={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onEdit={(m) => {
          setEditing({ id: m.id, name: m.name, is_youth: m.is_youth });
        }}
      />

      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-foreground/50">
          {query.trim() ? "No members match your search." : "No members in this ward."}
        </div>
      ) : null}
    </section>
  );
}
