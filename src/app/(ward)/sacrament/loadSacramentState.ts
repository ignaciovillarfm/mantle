import { createClient } from "@/lib/supabase/server";
import {
  MAX_DISCOURSE_SLOTS,
  MIN_DISCOURSE_SLOTS,
  normalizeSpeakerSlots,
  parseSacramentProgram,
  parseTalkResponseStatus,
  type SacramentProgramBody,
  type SpeakerSlot,
  type TalkResponseStatus,
} from "@/lib/sacramentProgram";
import { inferCallingGroup, type CallingGroupKey } from "@/lib/callings/groupCallingOptions";
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

export type SectionTemplateMap = Record<string, { en?: string; es?: string }>;

async function assertWardAccess(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId)) {
    throw new Error("Not authorized for this ward");
  }
}

type ParticipationRow = {
  slot: string;
  member_id: string | null;
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
    return {
      position,
      member_id: p?.member_id ?? null,
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
      maxDiscourse = Math.max(maxDiscourse, n);
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

export async function loadSacramentPageState(
  wardId: string,
  meetingDate: string,
): Promise<{
  members: MemberOption[];
  callingPositions: CallingPositionOption[];
  sectionTemplates: SectionTemplateMap;
  suggestions: LeadershipSuggestions;
  meeting: SacramentMeetingState | null;
  speakers: SpeakerRowState[];
  previous: PreviousSacramentSnapshot | null;
}> {
  await assertWardAccess(wardId);
  const supabase = await createClient();

  const meetingSelect =
    "id, date, theme, program, presiding_member_id, conducting_id, chorister_member_id, organist_member_id";
  const prevSelect =
    "id, theme, program, presiding_member_id, conducting_id, chorister_member_id, organist_member_id";

  const [membersRes, meetingRes, prevRes, positionsRes] = await Promise.all([
    supabase.from("members").select("id, name").eq("ward_id", wardId).order("name"),
    supabase.from("sacrament_meetings").select(meetingSelect).eq("ward_id", wardId).eq("date", meetingDate).maybeSingle(),
    supabase
      .from("sacrament_meetings")
      .select(prevSelect)
      .eq("ward_id", wardId)
      .lt("date", meetingDate)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("calling_positions")
      .select("id, title, sort_order")
      .eq("ward_id", wardId)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
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
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "sacrament-calling-translation-debug-1",
      hypothesisId: "H2",
      location: "loadSacramentState.ts:callingPositions",
      message: "Loaded calling position translations for sacrament",
      data: {
        wardId,
        totalPositions: callingPositions.length,
        translatedEsCount: callingPositions.filter((p) => p.titleEs !== p.titleEn).length,
        untranslatedSample: callingPositions
          .filter((p) => p.titleEs === p.titleEn)
          .slice(0, 8)
          .map((p) => p.titleEn),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const { data: templateRows } = await supabase
    .from("sacrament_section_templates")
    .select("template_key, lang, body");
  const sectionTemplates: SectionTemplateMap = {};
  for (const row of templateRows ?? []) {
    const key = row.template_key as string;
    const lang = row.lang as "en" | "es";
    const body = row.body as string;
    sectionTemplates[key] = { ...(sectionTemplates[key] ?? {}), [lang]: body };
  }

  const meetingRow = meetingRes.data;
  const prevMeeting = prevRes.data;

  let speakers: SpeakerRowState[] = [];
  let meeting: SacramentMeetingState | null = null;

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
      .select("slot, member_id, topic, response_status, response_note, fulfilled")
      .eq("meeting_id", meetingCore.id);

    const merged = mergeParticipationsIntoBundle(meetingCore, (partRows ?? []) as ParticipationRow[]);
    meeting = merged.meeting;
    speakers = merged.speakers;
  }

  let previous: PreviousSacramentSnapshot | null = null;
  if (prevMeeting) {
    const prevId = prevMeeting.id as string;
    const { data: prevPartRows } = await supabase
      .from("sacrament_participations")
      .select("slot, member_id")
      .eq("meeting_id", prevId);
    const prevBySlot = new Map((prevPartRows ?? []).map((p) => [p.slot as string, p.member_id as string | null]));

    previous = {
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

  const { data: callingsRows } = await supabase
    .from("callings")
    .select("name, member_id")
    .eq("ward_id", wardId)
    .eq("status", "Set Apart")
    .not("member_id", "is", null);

  const pickIds = (matchers: RegExp[]): string[] => {
    const ids = new Set<string>();
    for (const row of (callingsRows ?? []) as { name: string; member_id: string | null }[]) {
      if (!row.member_id) continue;
      const n = row.name.toLowerCase();
      if (matchers.some((r) => r.test(n))) ids.add(row.member_id);
    }
    return [...ids];
  };

  const bishopricMatchers = [
    /\bbishop\b/,
    /first counselor in the bishopric/,
    /second counselor in the bishopric/,
  ];
  const authorizedConductingFallbackMatchers = [
    /stake president/,
    /first counselor in the stake presidency/,
    /second counselor in the stake presidency/,
    /high councilor/,
    /high councillor/,
    /melchizedek priesthood/,
    /authorized priesthood holder/,
  ];

  const suggestions: LeadershipSuggestions = {
    presidingIds: pickIds(bishopricMatchers),
    conductingIds: pickIds([
      ...bishopricMatchers,
      ...authorizedConductingFallbackMatchers,
    ]),
    choristerIds: pickIds([
      /music leader/,
      /music director/,
      /music chairman/,
      /music adviser/,
      /choir director/,
      /chorister/,
    ]),
    organistIds: pickIds([
      /ward organist/,
      /ward pianist/,
      /primary pianist/,
      /choir accompanist/,
      /organist/,
      /pianist/,
    ]),
  };

  return { members, callingPositions, sectionTemplates, suggestions, meeting, speakers, previous };
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
