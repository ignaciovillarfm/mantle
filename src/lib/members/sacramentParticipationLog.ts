import type { SupabaseClient } from "@supabase/supabase-js";

export type SacramentParticipationLogRow = {
  wardId: string;
  meetingDate: string;
  memberId: string;
  memberName: string;
  slot: string;
  slotLabel: string;
  topic: string | null;
  responseStatus: string;
  responseNote: string | null;
  fulfilled: boolean | null;
};

function unwrapRelation<T>(v: unknown): T | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as T;
  if (Array.isArray(v) && v[0] && typeof v[0] === "object") return v[0] as T;
  return null;
}

export function slotLabel(slot: string): string {
  const m = /^discourse_(\d+)$/.exec(slot);
  if (m) return `Discourse ${m[1]}`;
  switch (slot) {
    case "opening_prayer":
      return "Opening prayer";
    case "closing_prayer":
      return "Closing prayer";
    default:
      return slot;
  }
}

const SLOT_ORDER: Record<string, number> = {
  discourse_1: 1,
  discourse_2: 2,
  discourse_3: 3,
  discourse_4: 4,
  discourse_5: 5,
  discourse_6: 6,
  discourse_7: 7,
  discourse_8: 8,
  opening_prayer: 9,
  closing_prayer: 10,
};

/**
 * Every assigned participation row for the given wards (member assigned to a slot).
 * For the Members directory “full log” view; latest-per-member rollups use `buildMemberSacramentRollups`.
 */
export async function fetchSacramentParticipationAssignmentLog(
  supabase: SupabaseClient,
  wardIds: string[],
): Promise<SacramentParticipationLogRow[]> {
  if (wardIds.length === 0) return [];

  const { data, error } = await supabase
    .from("sacrament_participations")
    .select(
      "ward_id, member_id, slot, topic, response_status, response_note, fulfilled, members ( name ), sacrament_meetings ( date )",
    )
    .in("ward_id", wardIds)
    .not("member_id", "is", null);

  if (error) throw error;

  type Raw = {
    ward_id: string;
    member_id: string | null;
    slot: string;
    topic: string | null;
    response_status: string;
    response_note: string | null;
    fulfilled: boolean | null;
    members: unknown;
    sacrament_meetings: unknown;
  };

  const rows: SacramentParticipationLogRow[] = [];
  for (const raw of (data ?? []) as Raw[]) {
    const mid = raw.member_id;
    if (!mid) continue;
    const m = unwrapRelation<{ name?: string }>(raw.members);
    const sm = unwrapRelation<{ date?: string }>(raw.sacrament_meetings);
    const date = typeof sm?.date === "string" ? sm.date : null;
    if (!date) continue;
    const name = typeof m?.name === "string" ? m.name : "—";
    rows.push({
      wardId: raw.ward_id,
      meetingDate: date,
      memberId: mid,
      memberName: name,
      slot: raw.slot,
      slotLabel: slotLabel(raw.slot),
      topic: raw.topic,
      responseStatus: raw.response_status,
      responseNote: raw.response_note,
      fulfilled: raw.fulfilled,
    });
  }

  rows.sort((a, b) => {
    const d = b.meetingDate.localeCompare(a.meetingDate);
    if (d !== 0) return d;
    return (SLOT_ORDER[a.slot] ?? 99) - (SLOT_ORDER[b.slot] ?? 99);
  });

  return rows;
}
