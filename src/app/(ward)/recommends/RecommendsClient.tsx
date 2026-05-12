"use client";

import { useCachedEdgeData } from "@/hooks/useCachedEdgeData";

type Row = {
  member_name: string;
  expiration_date: string;
  last_interview_date: string | null;
};

type Payload = { recommends: Row[] };

export function RecommendsClient() {
  const { data, fromCache, loading } = useCachedEdgeData<Payload>(
    "expiring-recommends",
    "/api/edge/get-expiring-recommends",
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Expiring recommends</h1>
      <p className="text-sm text-foreground/60">
        Next 60 days (bishop & counselors). No sensitive notes are loaded here.
      </p>
      {fromCache && (
        <p className="text-sm text-foreground/50">Showing cached data.</p>
      )}
      {loading && <p className="text-foreground/60">Loading…</p>}
      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {(data?.recommends ?? []).map((r, i) => (
          <li key={i} className="px-4 py-3">
            <div className="font-medium">{r.member_name}</div>
            <div className="text-sm text-foreground/60">
              Expires {r.expiration_date}
              {r.last_interview_date
                ? ` · last interview ${r.last_interview_date}`
                : ""}
            </div>
          </li>
        ))}
        {!loading && (data?.recommends ?? []).length === 0 && (
          <li className="px-4 py-8 text-center text-foreground/50">
            No recommends in this window
          </li>
        )}
      </ul>
    </div>
  );
}
