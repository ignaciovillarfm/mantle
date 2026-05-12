import { BishopricDiagram, type BishopricSlots } from "@/components/BishopricDiagram";
import { OrganizationGroupsModal } from "./OrganizationGroupsModal";
import { createClient } from "@/lib/supabase/server";
import { fetchUserWardRoles } from "@/lib/serverRoles";

type CallingRow = {
  id: string;
  ward_id: string;
  name: string;
  status: string;
  members: { id: string; name: string } | null;
};

type CallingPositionRow = {
  id: string;
  ward_id: string;
  title: string;
  sort_order: number;
};

function isActiveStatus(status: string) {
  const s = status.trim().toLowerCase();
  return (
    s === "proposed" ||
    s === "in prayer" ||
    s === "stake approval" ||
    s === "to interview" ||
    s === "to sustain" ||
    s === "set apart"
  );
}

function isBishopricCalling(name: string) {
  const n = name.trim().toLowerCase();
  return (
    n === "bishop" ||
    n.includes("in the bishopric") ||
    n === "ward clerk" ||
    n === "assistant ward clerk" ||
    n === "ward executive secretary"
  );
}

function formatRole(name: string) {
  const n = name.toLowerCase();
  if (n.includes("first counselor")) return "First Counselor";
  if (n.includes("second counselor")) return "Second Counselor";
  if (n.includes("ward clerk")) return "Ward Clerk";
  if (n.includes("bishop")) return "Bishop";
  return name;
}

function assignBishopricSlots(rows: CallingRow[]): BishopricSlots {
  const out: BishopricSlots = {
    bishop: null,
    firstCounselor: null,
    secondCounselor: null,
    wardClerk: null,
    assistantWardClerk: null,
    wardExecutiveSecretary: null,
  };
  for (const c of rows) {
    const n = c.name.trim().toLowerCase();
    const member = c.members?.name ?? null;
    if (!member) continue;
    if (n.includes("first counselor in the bishopric")) out.firstCounselor = out.firstCounselor ?? member;
    else if (n.includes("second counselor in the bishopric")) out.secondCounselor = out.secondCounselor ?? member;
    else if (n.includes("assistant ward clerk")) out.assistantWardClerk = out.assistantWardClerk ?? member;
    else if (n.includes("ward clerk")) out.wardClerk = out.wardClerk ?? member;
    else if (n.includes("ward executive secretary")) out.wardExecutiveSecretary = out.wardExecutiveSecretary ?? member;
    else if (n === "bishop") out.bishop = out.bishop ?? member;
  }
  return out;
}

type OrgGroupKey =
  | "bishopric_clerical"
  | "relief_society"
  | "elders_quorum"
  | "young_women"
  | "young_men"
  | "primary"
  | "sunday_school"
  | "other";

const ORG_GROUP_LABEL: Record<OrgGroupKey, string> = {
  bishopric_clerical: "Bishopric and Clerical",
  relief_society: "Relief Society",
  elders_quorum: "Elders Quorum",
  young_women: "Young Women",
  young_men: "Young Men",
  primary: "Primary",
  sunday_school: "Sunday School",
  other: "Other Organization Callings",
};

function callingOrgGroup(name: string): OrgGroupKey {
  const n = name.trim().toLowerCase();
  if (
    n === "bishop" ||
    n.includes("in the bishopric") ||
    n === "ward clerk" ||
    n === "assistant ward clerk" ||
    n === "ward executive secretary"
  ) {
    return "bishopric_clerical";
  }
  if (n.includes("relief society")) return "relief_society";
  if (n.includes("elders quorum")) return "elders_quorum";
  if (n.includes("young women")) return "young_women";
  if (n.includes("young men")) return "young_men";
  if (n.includes("primary")) return "primary";
  if (n.includes("sunday school")) return "sunday_school";
  return "other";
}

function normalizeTitle(s: string): string {
  return s.trim().toLowerCase();
}

export async function WardLeadershipView() {
  const supabase = await createClient();
  const wardRoles = await fetchUserWardRoles();
  const wardIds = Array.from(new Set(wardRoles.map((r) => r.ward_id)));
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "org-bishopric-debug-1",
      hypothesisId: "H1",
      location: "WardLeadershipView.tsx:wardScope",
      message: "Loaded ward scope from user_roles",
      data: {
        wardRoleCount: wardRoles.length,
        wardIds,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const { data: wards } = await supabase
    .from("wards")
    .select("id, name, created_at")
    .in("id", wardIds);

  const fallbackWards = wardRoles.map((r) => ({
    id: r.ward_id,
    name: r.wards?.name ?? `Ward ${r.ward_id.slice(0, 8)}`,
    created_at: null,
  }));
  const effectiveWards =
    (wards ?? []).length > 0
      ? (wards as { id: string; name: string; created_at: string | null }[])
      : fallbackWards;

  const { data: callingsData } = await supabase
    .from("callings")
    .select("id, ward_id, name, status, members ( id, name )")
    .in("ward_id", effectiveWards.map((w) => w.id))
    .order("created_at", { ascending: false });

  const { data: positionData } = await supabase
    .from("calling_positions")
    .select("id, ward_id, title, sort_order")
    .in("ward_id", effectiveWards.map((w) => w.id));

  const callings = (callingsData ?? []) as unknown as CallingRow[];
  const positions = (positionData ?? []) as unknown as CallingPositionRow[];
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "org-bishopric-debug-1",
      hypothesisId: "H2",
      location: "WardLeadershipView.tsx:callingsRaw",
      message: "Fetched callings before active-status filtering",
      data: {
        callingCount: callings.length,
        byStatus: callings.reduce<Record<string, number>>((acc, c) => {
          const k = String(c.status ?? "null");
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
        bishopricNamedCount: callings.filter((c) => isBishopricCalling(c.name)).length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "org-unassigned-debug-2",
      hypothesisId: "H5",
      location: "WardLeadershipView.tsx:positionsCatalog",
      message: "Loaded canonical calling positions for ward diagrams",
      data: {
        positionCount: positions.length,
        positionsByWard: positions.reduce<Record<string, number>>((acc, p) => {
          acc[p.ward_id] = (acc[p.ward_id] ?? 0) + 1;
          return acc;
        }, {}),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const bishopricByWard = new Map<string, CallingRow[]>();
  const leadersByWard = new Map<string, CallingRow[]>();
  for (const c of callings) {
    if (!isActiveStatus(c.status)) continue;
    if (isBishopricCalling(c.name)) {
      const arr = bishopricByWard.get(c.ward_id) ?? [];
      arr.push(c);
      bishopricByWard.set(c.ward_id, arr);
    } else {
      const arr = leadersByWard.get(c.ward_id) ?? [];
      arr.push(c);
      leadersByWard.set(c.ward_id, arr);
    }
  }
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "org-bishopric-debug-1",
      hypothesisId: "H3",
      location: "WardLeadershipView.tsx:classification",
      message: "Classified active callings into bishopric and organization buckets",
      data: {
        bishopricByWard: Array.from(bishopricByWard.entries()).map(([k, rows]) => ({
          wardId: k,
          count: rows.length,
          names: rows.map((r) => `${r.name}::${r.status}`),
        })),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <div className="space-y-6">
      {effectiveWards.map((ward) => {
        const wardId = ward.id as string;
        const bishopric = (bishopricByWard.get(wardId) ?? []).sort((a, b) =>
          formatRole(a.name).localeCompare(formatRole(b.name)),
        );
        const slots = assignBishopricSlots(bishopric);
        // #region agent log
        fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
          body: JSON.stringify({
            sessionId: "812a29",
            runId: "org-bishopric-debug-1",
            hypothesisId: "H4",
            location: "WardLeadershipView.tsx:slotAssignment",
            message: "Computed bishopric slots for ward",
            data: {
              wardId,
              bishopricRows: bishopric.map((r) => ({
                name: r.name,
                status: r.status,
                member: r.members?.name ?? null,
              })),
              slots,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const leaders = leadersByWard.get(wardId) ?? [];
        const wardPositions = positions.filter((p) => p.ward_id === wardId);
        // #region agent log
        fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
          body: JSON.stringify({
            sessionId: "812a29",
            runId: "org-unassigned-debug-2",
            hypothesisId: "H6",
            location: "WardLeadershipView.tsx:expectedVsAssigned",
            message: "Compared expected calling positions to assigned rows",
            data: {
              wardId,
              expectedCount: wardPositions.length,
              assignedCount: leaders.length + bishopric.length,
              missingSample: wardPositions
                .filter(
                  (p) =>
                    !callings.some(
                      (c) =>
                        c.ward_id === wardId &&
                        c.name.trim().toLowerCase() === p.title.trim().toLowerCase(),
                    ),
                )
                .slice(0, 10)
                .map((p) => p.title),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const grouped = new Map<OrgGroupKey, CallingRow[]>();
        for (const c of leaders) {
          const g = callingOrgGroup(c.name);
          const arr = grouped.get(g) ?? [];
          arr.push(c);
          grouped.set(g, arr);
        }
        const activeByTitle = new Map<string, CallingRow>();
        for (const c of [...bishopric, ...leaders]) {
          const k = normalizeTitle(c.name);
          const existing = activeByTitle.get(k);
          if (!existing) activeByTitle.set(k, c);
          else if (!existing.members?.name && c.members?.name) activeByTitle.set(k, c);
        }

        const expectedGrouped = new Map<OrgGroupKey, { id: string; title: string; memberName: string | null }[]>();
        for (const p of wardPositions.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title))) {
          const g = callingOrgGroup(p.title);
          const arr = expectedGrouped.get(g) ?? [];
          arr.push({
            id: p.id,
            title: p.title,
            memberName: activeByTitle.get(normalizeTitle(p.title))?.members?.name ?? null,
          });
          expectedGrouped.set(g, arr);
        }

        const orderedGroups = ([
          "bishopric_clerical",
          "relief_society",
          "elders_quorum",
          "young_women",
          "young_men",
          "primary",
          "sunday_school",
          "other",
        ] as OrgGroupKey[])
          .map((k) => ({
            key: k,
            label: ORG_GROUP_LABEL[k],
            rows: expectedGrouped.get(k) ?? [],
          }))
          .filter((g) => g.rows.length > 0);
        const bishopricClericalGroup = orderedGroups.find((g) => g.key === "bishopric_clerical");
        const otherGroups = orderedGroups.filter((g) => g.key !== "bishopric_clerical");
        const bishopricSlots = {
          ...slots,
          assistantWardClerk:
            bishopricClericalGroup?.rows.find((r) => normalizeTitle(r.title) === "assistant ward clerk")
              ?.memberName ?? null,
          wardExecutiveSecretary:
            bishopricClericalGroup?.rows.find((r) => normalizeTitle(r.title) === "ward executive secretary")
              ?.memberName ?? null,
        };
        // #region agent log
        fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
          body: JSON.stringify({
            sessionId: "812a29",
            runId: "org-unassigned-debug-4-post-fix",
            hypothesisId: "H7",
            location: "WardLeadershipView.tsx:renderedGroups",
            message: "Built organization UI model (bishopric detailed, other groups title-only)",
            data: {
              wardId,
              uiMode: "bishopric-diagram-includes-clerical-no-second-div",
              bishopricClericalPreview: (expectedGrouped.get("bishopric_clerical") ?? []).map((r) => ({
                title: r.title,
                member: r.memberName,
              })),
              bishopricSlots,
              hasSeparateBishopricDiv: false,
              otherGroupTitles: otherGroups.map((g) => g.label),
              groupSizes: orderedGroups.map((g) => ({ key: g.key, count: g.rows.length })),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        return (
          <section key={wardId} className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <div>
              <h3 className="text-lg font-semibold">{ward.name as string}</h3>
            </div>

            <BishopricDiagram slots={bishopricSlots} />

            {otherGroups.length === 0 ? (
              <div className="rounded-lg border border-border bg-background p-4 text-sm text-foreground/50">
                No other organization groups configured for this ward.
              </div>
            ) : (
              <OrganizationGroupsModal wardId={wardId} groups={otherGroups} />
            )}
          </section>
        );
      })}

      {effectiveWards.length === 0 && (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
          You are not assigned to any ward yet.
        </div>
      )}
    </div>
  );
}
