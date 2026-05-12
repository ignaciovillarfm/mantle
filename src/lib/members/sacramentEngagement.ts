import type { SupabaseClient } from "@supabase/supabase-js";

export type MemberSacramentRollup = {
  lastTalkSunday: string | null;
  lastTalkResponse: "pending" | "accepted" | "declined" | null;
  lastTalkNote: string | null;
  lastTalkDelivered: boolean | null;
  /** Latest sacrament Sunday where they were assigned opening or closing prayer (same ward). */
  lastPrayerSunday: string | null;
  lastPrayerRole: "opening" | "closing" | null;
  lastPrayerResponse: "pending" | "accepted" | "declined" | null;
  lastPrayerNote: string | null;
  lastPrayerFulfilled: boolean | null;
};

function normalizeResponse(v: unknown): MemberSacramentRollup["lastTalkResponse"] {
  if (v === "pending" || v === "accepted" || v === "declined") return v;
  return null;
}

function meetingFromParticipationRow(row: {
  sacrament_meetings: unknown;
}): { date: string; ward_id: string } | null {
  const sm = row.sacrament_meetings;
  if (sm && typeof sm === "object" && !Array.isArray(sm)) {
    const o = sm as { date?: string; ward_id?: string };
    if (typeof o.date === "string" && typeof o.ward_id === "string") return { date: o.date, ward_id: o.ward_id };
  }
  if (Array.isArray(sm) && sm[0] && typeof sm[0] === "object") {
    const o = sm[0] as { date?: string; ward_id?: string };
    if (typeof o.date === "string" && typeof o.ward_id === "string") return { date: o.date, ward_id: o.ward_id };
  }
  return null;
}

type TalkBest = {
  date: string;
  status: string | null;
  note: string | null;
  fulfilled: boolean | null;
};

type PrayerBest = {
  date: string;
  role: "opening" | "closing";
  status: string | null;
  note: string | null;
  fulfilled: boolean | null;
};

/**
 * Latest discourse and latest prayer assignment per member from `sacrament_participations`
 * (same source as the Sacrament tab).
 */
export async function buildMemberSacramentRollups(
  supabase: SupabaseClient,
  members: { id: string; ward_id: string }[],
): Promise<Map<string, MemberSacramentRollup>> {
  const out = new Map<string, MemberSacramentRollup>();
  for (const m of members) {
    out.set(m.id, {
      lastTalkSunday: null,
      lastTalkResponse: null,
      lastTalkNote: null,
      lastTalkDelivered: null,
      lastPrayerSunday: null,
      lastPrayerRole: null,
      lastPrayerResponse: null,
      lastPrayerNote: null,
      lastPrayerFulfilled: null,
    });
  }
  if (members.length === 0) return out;

  const ids = members.map((m) => m.id);
  const wardIds = [...new Set(members.map((m) => m.ward_id))];

  const { data: partRows } = await supabase
    .from("sacrament_participations")
    .select(
      "member_id, slot, response_status, response_note, fulfilled, ward_id, sacrament_meetings!inner(date, ward_id)",
    )
    .in("member_id", ids)
    .in("ward_id", wardIds);

  type PRow = {
    member_id: string | null;
    slot: string;
    response_status: string | null;
    response_note: string | null;
    fulfilled: boolean | null;
    ward_id: string;
    sacrament_meetings: unknown;
  };

  const wardByMember = new Map(members.map((m) => [m.id, m.ward_id]));
  const bestTalk = new Map<string, TalkBest>();
  const bestPrayer = new Map<string, PrayerBest>();

  for (const raw of (partRows ?? []) as PRow[]) {
    const mid = raw.member_id;
    if (!mid) continue;
    const memWard = wardByMember.get(mid);
    if (!memWard || raw.ward_id !== memWard) continue;
    const mtg = meetingFromParticipationRow(raw);
    if (!mtg || mtg.ward_id !== memWard) continue;

    const isDiscourse = raw.slot.startsWith("discourse_");
    if (isDiscourse) {
      const cur = bestTalk.get(mid);
      if (!cur || mtg.date > cur.date) {
        bestTalk.set(mid, {
          date: mtg.date,
          status: raw.response_status,
          note: raw.response_note,
          fulfilled: raw.fulfilled,
        });
      }
      continue;
    }

    if (raw.slot === "opening_prayer" || raw.slot === "closing_prayer") {
      const role = raw.slot === "opening_prayer" ? "opening" : "closing";
      const cur = bestPrayer.get(mid);
      if (!cur || mtg.date > cur.date) {
        bestPrayer.set(mid, {
          date: mtg.date,
          role,
          status: raw.response_status,
          note: raw.response_note,
          fulfilled: raw.fulfilled,
        });
      }
    }
  }

  for (const [mid, v] of bestTalk) {
    const rollup = out.get(mid);
    if (rollup) {
      rollup.lastTalkSunday = v.date;
      rollup.lastTalkResponse = normalizeResponse(v.status);
      rollup.lastTalkNote = v.note;
      rollup.lastTalkDelivered = v.fulfilled;
    }
  }

  for (const [pid, v] of bestPrayer) {
    const rollup = out.get(pid);
    if (rollup) {
      rollup.lastPrayerSunday = v.date;
      rollup.lastPrayerRole = v.role;
      rollup.lastPrayerResponse = normalizeResponse(v.status);
      rollup.lastPrayerNote = v.note;
      rollup.lastPrayerFulfilled = v.fulfilled;
    }
  }

  return out;
}
