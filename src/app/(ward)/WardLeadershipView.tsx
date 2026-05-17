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

  return (
    <div className="space-y-6">
      {effectiveWards.map((ward) => {
        const wardId = ward.id as string;
        const bishopric = (bishopricByWard.get(wardId) ?? []).sort((a, b) =>
          formatRole(a.name).localeCompare(formatRole(b.name)),
        );
        const slots = assignBishopricSlots(bishopric);
        const leaders = leadersByWard.get(wardId) ?? [];
        const wardPositions = positions.filter((p) => p.ward_id === wardId);
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
