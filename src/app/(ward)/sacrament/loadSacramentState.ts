import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  formatLocalISODate,
  MAX_DISCOURSE_SLOTS,
  MIN_DISCOURSE_SLOTS,
  normalizeSpeakerSlots,
  parseLocalDateFromISO,
  parseSacramentProgram,
  parseTalkResponseStatus,
  type SacramentProgramBody,
  type SpeakerSlot,
  type TalkResponseStatus,
} from "@/lib/sacramentProgram";
import {
  extractTestimonyUsageFromMeetings,
  type TestimonyMessageUsage,
} from "@/lib/sacramentTestimonyMessages";
import { inferCallingGroup, type CallingGroupKey } from "@/lib/callings/groupCallingOptions";
import {
  SACRAMENT_ROLE_KEYS,
  type SacramentRoleKey,
  type SacramentRolePool,
} from "@/lib/sacrament/sacramentRoles";
import { fetchUserWardRoles } from "@/lib/serverRoles";

export type MemberOption = { id: string; name: string };

/** Ward catalog row from `calling_positions` (for sacrament business modals). */
export type CallingPositionOption = {
  id: string;
  titleEn: string;
  titleEs: string;
  groupKey: CallingGroupKey;
};

export type SpeakerRowState = SpeakerSlot;

export type SacramentMeetingState = {
  id: string;
  date: string;
  theme: string | null;
  program: SacramentProgramBody;
  presiding_member_id: string | null;
  conducting_id: string | null;
  chorister_member_id: string | null;
  organist_member_id: string | null;
  opening_prayer_member_id: string | null;
  closing_prayer_member_id: string | null;
  opening_prayer_response_status: TalkResponseStatus;
  opening_prayer_response_note: string | null;
  opening_prayer_fulfilled: boolean | null;
  closing_prayer_response_status: TalkResponseStatus;
  closing_prayer_response_note: string | null;
  closing_prayer_fulfilled: boolean | null;
};

export type PreviousSacramentSnapshot = {
  program: SacramentProgramBody;
  theme: string | null;
  presiding_member_id: string | null;
  conducting_id: string | null;
  chorister_member_id: string | null;
  organist_member_id: string | null;
  opening_prayer_member_id: string | null;
  closing_prayer_member_id: string | null;
};

export type LeadershipSuggestions = {
  presidingIds: string[];
  conductingIds: string[];
  choristerIds: string[];
  organistIds: string[];
};

/** Past speakers suggested when assigning discourses (have given talks before). */
export type SpeakerTalkSuggestion = {
  memberId: string;
  name: string;
  lastTalkDate: string | null;
};

export type MemberActiveCallingMap = Record<
  string,
  { callingPositionId: string; title: string }[]
>;

export type { SacramentRolePool, SacramentRoleKey };
export { SACRAMENT_ROLE_KEYS };

export type SectionTemplateMap = Record<string, { en?: string; es?: string }>;

async function assertWardAccess(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId)) {
    throw new Error("Not authorized for this ward");
  }
}

function buildRolePool(
  rows: { role_key: string; member_id: string }[] | null,
): SacramentRolePool {
  const pool: SacramentRolePool = {
    presiding: [],
    conducting: [],
    chorister: [],
    organist: [],
  };
  for (const row of rows ?? []) {
    const key = row.role_key as SacramentRoleKey;
    if (!SACRAMENT_ROLE_KEYS.includes(key)) continue;
    const memberId = row.member_id;
    if (!pool[key].includes(memberId)) pool[key].push(memberId);
  }
  return pool;
}

export async function loadSacramentRolePool(wardId: string): Promise<SacramentRolePool> {
  await assertWardAccess(wardId);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("sacrament_role_pool_members")
    .select("role_key, member_id, sort_order")
    .eq("ward_id", wardId)
    .order("sort_order", { ascending: true });

  return buildRolePool((rows ?? []) as { role_key: string; member_id: string }[]);
}

const EMPTY_SUGGESTIONS: LeadershipSuggestions = {
  presidingIds: [],
  conductingIds: [],
  choristerIds: [],
  organistIds: [],
};

type SacramentWardCatalog = {
  members: MemberOption[];
  callingPositions: CallingPositionOption[];
  sectionTemplates: SectionTemplateMap;
  suggestions: LeadershipSuggestions;
  rolePool: SacramentRolePool;
  memberActiveCallings: MemberActiveCallingMap;
  speakerTalkSuggestions: SpeakerTalkSuggestion[];
};

/** Ward-scoped catalog shared across current/prev/next week loads in one RSC request. */
const loadSacramentWardCatalog = cache(async (wardId: string): Promise<SacramentWardCatalog> => {
  await assertWardAccess(wardId);
  const supabase = await createClient();

  const [membersRes, positionsRes, templatesRes, rolePoolRes, callingsRes, priorTalksRes] =
    await Promise.all([
    supabase.from("members").select("id, name, last_pulpit_date").eq("ward_id", wardId).order("name"),
    supabase
      .from("calling_positions")
      .select("id, title, sort_order")
      .eq("ward_id", wardId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
    supabase.from("sacrament_section_templates").select("template_key, lang, body"),
    supabase
      .from("sacrament_role_pool_members")
      .select("role_key, member_id, sort_order")
      .eq("ward_id", wardId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("callings")
      .select("member_id, calling_position_id, name")
      .eq("ward_id", wardId)
      .eq("status", "Set Apart")
      .not("member_id", "is", null)
      .not("calling_position_id", "is", null),
    supabase
      .from("sacrament_participations")
      .select("member_id, sacrament_meetings!inner(date, ward_id)")
      .eq("sacrament_meetings.ward_id", wardId)
      .like("slot", "discourse_%")
      .not("member_id", "is", null)
      .limit(400),
  ]);

  const members = (membersRes.data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));

  const basePositions = (positionsRes.data ?? []).map((r) => ({
    id: r.id as string,
    titleEn: r.title as string,
  }));
  const basePositionIds = basePositions.map((p) => p.id);

  let titleEsById = new Map<string, string>();
  if (basePositionIds.length > 0) {
    const { data: trRows } = await supabase
      .from("calling_position_translations")
      .select("calling_position_id, locale, title")
      .eq("locale", "es")
      .in("calling_position_id", basePositionIds);
    titleEsById = new Map(
      (trRows ?? []).map((r) => [r.calling_position_id as string, r.title as string]),
    );
  }

  const callingPositions = basePositions.map((p) => ({
    id: p.id,
    titleEn: p.titleEn,
    titleEs: titleEsById.get(p.id)?.trim() || p.titleEn,
    groupKey: inferCallingGroup(p.titleEn),
  }));

  const sectionTemplates: SectionTemplateMap = {};
  for (const row of templatesRes.data ?? []) {
    const key = row.template_key as string;
    const lang = row.lang as "en" | "es";
    const body = row.body as string;
    sectionTemplates[key] = { ...(sectionTemplates[key] ?? {}), [lang]: body };
  }

  const memberActiveCallings: MemberActiveCallingMap = {};
  for (const row of callingsRes.data ?? []) {
    const mid = row.member_id as string | null;
    const pid = row.calling_position_id as string | null;
    if (!mid || !pid) continue;
    const list = memberActiveCallings[mid] ?? [];
    if (!list.some((c) => c.callingPositionId === pid)) {
      list.push({ callingPositionId: pid, title: (row.name as string) ?? "" });
      memberActiveCallings[mid] = list;
    }
  }

  const lastTalkByMember = new Map<string, string>();
  for (const row of priorTalksRes.data ?? []) {
    const mid = row.member_id as string | null;
    if (!mid) continue;
    const meeting = row.sacrament_meetings as { date?: string } | { date?: string }[] | null;
    const date = Array.isArray(meeting) ? meeting[0]?.date : meeting?.date;
    if (typeof date !== "string" || !date) continue;
    const existing = lastTalkByMember.get(mid);
    if (!existing || date > existing) lastTalkByMember.set(mid, date);
  }
  for (const r of membersRes.data ?? []) {
    const mid = r.id as string;
    const lastPulpit = r.last_pulpit_date as string | null;
    if (!lastPulpit) continue;
    const existing = lastTalkByMember.get(mid);
    if (!existing || lastPulpit > existing) lastTalkByMember.set(mid, lastPulpit);
  }

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const speakerTalkSuggestions: SpeakerTalkSuggestion[] = [...lastTalkByMember.entries()]
    .map(([memberId, lastTalkDate]) => ({
      memberId,
      name: nameById.get(memberId) ?? "",
      lastTalkDate,
    }))
    .filter((s) => s.name)
    .sort((a, b) => {
      const da = a.lastTalkDate ?? "";
      const db = b.lastTalkDate ?? "";
      if (da !== db) return da < db ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 24);

  return {
    members,
    callingPositions,
    sectionTemplates,
    suggestions: EMPTY_SUGGESTIONS,
    rolePool: buildRolePool((rolePoolRes.data ?? []) as { role_key: string; member_id: string }[]),
    memberActiveCallings,
    speakerTalkSuggestions,
  };
});

type ParticipationRow = {
  slot: string;
  member_id: string | null;
  guest_name: string | null;
  topic: string | null;
  response_status: string | null;
  response_note: string | null;
  fulfilled: boolean | null;
};

function mergeParticipationsIntoBundle(
  meetingCore: {
    id: string;
    date: string;
    theme: string | null;
    program: SacramentProgramBody;
    presiding_member_id: string | null;
    conducting_id: string | null;
    chorister_member_id: string | null;
    organist_member_id: string | null;
  },
  partRows: ParticipationRow[],
): { meeting: SacramentMeetingState; speakers: SpeakerRowState[] } {
  const bySlot = new Map(partRows.map((p) => [p.slot, p]));
  const row = (slot: string) => bySlot.get(slot);

  const slotToSpeaker = (slot: string, position: number): SpeakerSlot => {
    const p = row(slot);
    const memberId = p?.member_id ?? null;
    const guestName = memberId ? null : (p?.guest_name ?? null);
    return {
      position,
      member_id: memberId,
      guest_name: guestName,
      topic: p?.topic ?? null,
      response_status: parseTalkResponseStatus(p?.response_status),
      response_note: p?.response_note ?? null,
      fulfilled: p?.fulfilled === true || p?.fulfilled === false ? p.fulfilled : null,
    };
  };

  let maxDiscourse = 0;
  for (const pr of partRows) {
    const m = /^discourse_(\d+)$/.exec(pr.slot);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= MAX_DISCOURSE_SLOTS) {
      if (pr.member_id || pr.guest_name !== null) {
        maxDiscourse = Math.max(maxDiscourse, n);
      }
    }
  }
  const discourseCount = Math.min(
    MAX_DISCOURSE_SLOTS,
    Math.max(MIN_DISCOURSE_SLOTS, maxDiscourse),
  );
  const rawSpeakers: SpeakerSlot[] = [];
  for (let p = 1; p <= discourseCount; p++) {
    rawSpeakers.push(slotToSpeaker(`discourse_${p}`, p));
  }
  const speakers = normalizeSpeakerSlots(rawSpeakers);

  const op = row("opening_prayer");
  const cl = row("closing_prayer");

  const meeting: SacramentMeetingState = {
    ...meetingCore,
    opening_prayer_member_id: op?.member_id ?? null,
    closing_prayer_member_id: cl?.member_id ?? null,
    opening_prayer_response_status: parseTalkResponseStatus(op?.response_status),
    opening_prayer_response_note: op?.response_note ?? null,
    opening_prayer_fulfilled: op?.fulfilled === true || op?.fulfilled === false ? op.fulfilled : null,
    closing_prayer_response_status: parseTalkResponseStatus(cl?.response_status),
    closing_prayer_response_note: cl?.response_note ?? null,
    closing_prayer_fulfilled: cl?.fulfilled === true || cl?.fulfilled === false ? cl.fulfilled : null,
  };

  return { meeting, speakers };
}

export async function loadPreviousSacramentSnapshot(
  wardId: string,
  meetingDate: string,
): Promise<PreviousSacramentSnapshot | null> {
  await assertWardAccess(wardId);
  const supabase = await createClient();
  const { data: prevMeeting } = await supabase
    .from("sacrament_meetings")
    .select(
      "id, theme, program, presiding_member_id, conducting_id, chorister_member_id, organist_member_id",
    )
    .eq("ward_id", wardId)
    .lt("date", meetingDate)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!prevMeeting) return null;

  const { data: prevPartRows } = await supabase
    .from("sacrament_participations")
    .select("slot, member_id")
    .eq("meeting_id", prevMeeting.id as string);
  const prevBySlot = new Map(
    (prevPartRows ?? []).map((p) => [p.slot as string, p.member_id as string | null]),
  );

  return {
    theme: (prevMeeting.theme as string | null) ?? null,
    program: parseSacramentProgram(prevMeeting.program),
    presiding_member_id: (prevMeeting.presiding_member_id as string | null) ?? null,
    conducting_id: (prevMeeting.conducting_id as string | null) ?? null,
    chorister_member_id: (prevMeeting.chorister_member_id as string | null) ?? null,
    organist_member_id: (prevMeeting.organist_member_id as string | null) ?? null,
    opening_prayer_member_id: (prevBySlot.get("opening_prayer") as string | null) ?? null,
    closing_prayer_member_id: (prevBySlot.get("closing_prayer") as string | null) ?? null,
  };
}

export async function loadSacramentPageState(
  wardId: string,
  meetingDate: string,
): Promise<{
  members: MemberOption[];
  callingPositions: CallingPositionOption[];
  sectionTemplates: SectionTemplateMap;
  suggestions: LeadershipSuggestions;
  rolePool: SacramentRolePool;
  memberActiveCallings: MemberActiveCallingMap;
  speakerTalkSuggestions: SpeakerTalkSuggestion[];
  meeting: SacramentMeetingState | null;
  speakers: SpeakerRowState[];
  previous: PreviousSacramentSnapshot | null;
  testimonyMessageUsage: TestimonyMessageUsage[];
}> {
  await assertWardAccess(wardId);
  const supabase = await createClient();

  const meetingSelect =
    "id, date, theme, program, presiding_member_id, conducting_id, chorister_member_id, organist_member_id";

  const testimonyCutoff = (() => {
    const d = parseLocalDateFromISO(meetingDate);
    d.setMonth(d.getMonth() - 2);
    return formatLocalISODate(d);
  })();

  const [catalog, meetingRes, recentForTestimony] = await Promise.all([
    loadSacramentWardCatalog(wardId),
    supabase
      .from("sacrament_meetings")
      .select(meetingSelect)
      .eq("ward_id", wardId)
      .eq("date", meetingDate)
      .maybeSingle(),
    supabase
      .from("sacrament_meetings")
      .select("date, program")
      .eq("ward_id", wardId)
      .gte("date", testimonyCutoff)
      .lt("date", meetingDate)
      .order("date", { ascending: false }),
  ]);

  let speakers: SpeakerRowState[] = [];
  let meeting: SacramentMeetingState | null = null;

  const meetingRow = meetingRes.data;
  if (meetingRow) {
    const parsed = parseSacramentProgram(meetingRow.program);
    const themeCol = (meetingRow.theme as string | null) ?? null;
    const meetingCore = {
      id: meetingRow.id as string,
      date: meetingRow.date as string,
      theme: themeCol,
      program: {
        ...parsed,
        preparationTheme: parsed.preparationTheme || themeCol || "",
      },
      presiding_member_id: (meetingRow.presiding_member_id as string | null) ?? null,
      conducting_id: (meetingRow.conducting_id as string | null) ?? null,
      chorister_member_id: (meetingRow.chorister_member_id as string | null) ?? null,
      organist_member_id: (meetingRow.organist_member_id as string | null) ?? null,
    };

    const { data: partRows } = await supabase
      .from("sacrament_participations")
      .select("slot, member_id, guest_name, topic, response_status, response_note, fulfilled")
      .eq("meeting_id", meetingCore.id);

    const merged = mergeParticipationsIntoBundle(meetingCore, (partRows ?? []) as ParticipationRow[]);
    meeting = merged.meeting;
    speakers = merged.speakers;
  }

  const testimonyMessageUsage = extractTestimonyUsageFromMeetings(
    (recentForTestimony.data ?? []) as { date: string; program: unknown }[],
  );

  return {
    ...catalog,
    meeting,
    speakers,
    previous: null,
    testimonyMessageUsage,
  };
}

export type SacramentPageBundle = Awaited<ReturnType<typeof loadSacramentPageState>>;

export type HistoryRow = {
  id: string;
  date: string;
  theme: string | null;
  presidingName: string | null;
};

export async function loadSacramentHistory(wardId: string, limit = 52): Promise<HistoryRow[]> {
  await assertWardAccess(wardId);
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("sacrament_meetings")
    .select("id, date, theme, presiding_member_id")
    .eq("ward_id", wardId)
    .order("date", { ascending: false })
    .limit(limit);

  const list = rows ?? [];
  const presIds = Array.from(
    new Set(list.map((r) => r.presiding_member_id).filter((x): x is string => Boolean(x))),
  );
  let nameById = new Map<string, string>();
  if (presIds.length > 0) {
    const { data: mems } = await supabase.from("members").select("id, name").in("id", presIds);
    nameById = new Map((mems ?? []).map((m) => [m.id as string, m.name as string]));
  }

  return list.map((r) => ({
    id: r.id as string,
    date: r.date as string,
    theme: (r.theme as string | null) ?? null,
    presidingName: r.presiding_member_id
      ? (nameById.get(r.presiding_member_id as string) ?? null)
      : null,
  }));
}
