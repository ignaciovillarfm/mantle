import type {
  SacramentMeetingState,
  SacramentPageBundle,
  SpeakerRowState,
} from "@/app/(ward)/sacrament/loadSacramentState";
import {
  normalizeSpeakerSlots,
  sacramentMeetingProgramKind,
  type SacramentProgramBody,
  type SpeakerSlot,
} from "@/lib/sacramentProgram";
import type { TestimonyMessageUsage } from "@/lib/sacramentTestimonyMessages";

function testimonyUsageAfterSave(
  prev: TestimonyMessageUsage[],
  date: string,
  program: SacramentProgramBody,
): TestimonyMessageUsage[] {
  if (sacramentMeetingProgramKind(date) !== "testimony") return prev;
  const id = program.testimonyMessageId.trim();
  if (!id) return prev.filter((u) => u.date !== date);
  const rest = prev.filter((u) => u.date !== date);
  return [{ id, date }, ...rest];
}

/** Builds the page bundle we expect after a successful persist (immediate cache update). */
export function mergeSacramentBundleAfterSave(
  prev: SacramentPageBundle,
  input: {
    meetingId: string;
    date: string;
    theme: string | null;
    program: SacramentProgramBody;
    presiding_member_id: string | null;
    conducting_id: string | null;
    chorister_member_id: string | null;
    organist_member_id: string | null;
    opening_prayer_member_id: string | null;
    closing_prayer_member_id: string | null;
    opening_prayer_response_status: SacramentMeetingState["opening_prayer_response_status"];
    opening_prayer_response_note: string | null;
    opening_prayer_fulfilled: boolean | null;
    closing_prayer_response_status: SacramentMeetingState["closing_prayer_response_status"];
    closing_prayer_response_note: string | null;
    closing_prayer_fulfilled: boolean | null;
    speakers: SpeakerSlot[];
  },
): SacramentPageBundle {
  const meeting: SacramentMeetingState = {
    id: input.meetingId,
    date: input.date,
    theme: input.theme,
    program: input.program,
    presiding_member_id: input.presiding_member_id,
    conducting_id: input.conducting_id,
    chorister_member_id: input.chorister_member_id,
    organist_member_id: input.organist_member_id,
    opening_prayer_member_id: input.opening_prayer_member_id,
    closing_prayer_member_id: input.closing_prayer_member_id,
    opening_prayer_response_status: input.opening_prayer_response_status,
    opening_prayer_response_note: input.opening_prayer_response_note,
    opening_prayer_fulfilled: input.opening_prayer_fulfilled,
    closing_prayer_response_status: input.closing_prayer_response_status,
    closing_prayer_response_note: input.closing_prayer_response_note,
    closing_prayer_fulfilled: input.closing_prayer_fulfilled,
  };
  const speakers: SpeakerRowState[] = normalizeSpeakerSlots(input.speakers);
  return {
    members: prev.members,
    callingPositions: prev.callingPositions,
    sectionTemplates: prev.sectionTemplates,
    suggestions: prev.suggestions,
    rolePool: prev.rolePool,
    meeting,
    speakers,
    previous: prev.previous,
    testimonyMessageUsage: testimonyUsageAfterSave(
      prev.testimonyMessageUsage,
      input.date,
      input.program,
    ),
  };
}
