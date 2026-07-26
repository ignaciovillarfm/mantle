"use client";

import { filterMembersByQuery } from "@/lib/members/memberSearch";
import { useMemo, useState } from "react";

export type MembersDirectoryRow = {
  id: string;
  name: string;
  is_youth: boolean;
  lastTalkSunday: string | null;
  lastTalkNote: string | null;
  lastTalkDelivered: boolean | null;
  lastPrayerSunday: string | null;
  lastPrayerRole: string;
  lastPrayerNote: string | null;
  lastPrayerFulfilled: boolean | null;
};

function formatDelivered(v: boolean | null): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function truncate(s: string | null, max: number): string {
  if (!s) return "—";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function MembersDirectoryClient({
  wardName,
  members,
}: {
  wardName: string;
  members: MembersDirectoryRow[];
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      filterMembersByQuery(
        members.map((m) => ({ id: m.id, name: m.name })),
        query,
      ).map((m) => members.find((row) => row.id === m.id)!),
    [members, query],
  );

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">{wardName}</h2>
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
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-foreground/60">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Last talk assignment</th>
              <th className="px-4 py-2 font-medium">Talk notes</th>
              <th className="px-4 py-2 font-medium">Spoke that day</th>
              <th className="px-4 py-2 font-medium">Last prayer assignment</th>
              <th className="px-4 py-2 font-medium">Opening / closing</th>
              <th className="px-4 py-2 font-medium">Prayer notes</th>
              <th className="px-4 py-2 font-medium">Prayed that day</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((m) => (
              <tr key={m.id} className="align-top">
                <td className="px-4 py-3 font-medium">
                  {m.name}
                  {m.is_youth ? <span className="ml-1 text-foreground/50">· youth</span> : null}
                </td>
                <td className="px-4 py-3 text-foreground/80">{m.lastTalkSunday ?? "—"}</td>
                <td className="max-w-[180px] px-4 py-3 text-foreground/80" title={m.lastTalkNote ?? undefined}>
                  {truncate(m.lastTalkNote, 72)}
                </td>
                <td className="px-4 py-3 text-foreground/80">{formatDelivered(m.lastTalkDelivered)}</td>
                <td className="px-4 py-3 text-foreground/80">{m.lastPrayerSunday ?? "—"}</td>
                <td className="px-4 py-3 text-foreground/80">{m.lastPrayerRole}</td>
                <td className="max-w-[180px] px-4 py-3 text-foreground/80" title={m.lastPrayerNote ?? undefined}>
                  {truncate(m.lastPrayerNote, 72)}
                </td>
                <td className="px-4 py-3 text-foreground/80">{formatDelivered(m.lastPrayerFulfilled)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-foreground/50">
          {query.trim() ? "No members match your search." : "No members in this ward."}
        </div>
      ) : null}
    </section>
  );
}
