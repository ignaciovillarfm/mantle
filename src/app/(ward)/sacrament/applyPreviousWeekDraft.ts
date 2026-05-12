import {
  mergeProgramFromPrevious,
  normalizeSpeakerSlots,
  type SacramentProgramBody,
} from "@/lib/sacramentProgram";
import { loadSacramentPageState } from "./loadSacramentState";

export type ApplyPreviousDraft = {
  program: SacramentProgramBody;
  theme: string | null;
  presiding_member_id: string | null;
  conducting_id: string | null;
  chorister_member_id: string | null;
  organist_member_id: string | null;
  opening_prayer_member_id: string | null;
  closing_prayer_member_id: string | null;
  speakers: ReturnType<typeof normalizeSpeakerSlots>;
};

/** Server-side draft for “copy from previous meeting” (used by Route Handler). */
export async function buildApplyPreviousWeekDraft(
  wardId: string,
  forMeetingDate: string,
): Promise<{ ok: true; draft: ApplyPreviousDraft } | { ok: false; error: string }> {
  try {
    const { previous } = await loadSacramentPageState(wardId, forMeetingDate);
    if (!previous) {
      return { ok: false, error: "No previous saved program for this ward." };
    }
    const merged = mergeProgramFromPrevious(previous.program);
    const program: SacramentProgramBody = {
      ...merged,
      preparationTheme: previous.theme || merged.preparationTheme,
    };
    return {
      ok: true,
      draft: {
        program,
        theme: previous.theme,
        presiding_member_id: previous.presiding_member_id,
        conducting_id: previous.conducting_id,
        chorister_member_id: previous.chorister_member_id,
        organist_member_id: previous.organist_member_id,
        opening_prayer_member_id: previous.opening_prayer_member_id,
        closing_prayer_member_id: previous.closing_prayer_member_id,
        speakers: normalizeSpeakerSlots([]),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load previous program";
    return { ok: false, error: msg };
  }
}
