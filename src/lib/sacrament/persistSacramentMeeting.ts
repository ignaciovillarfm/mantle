import { createClient } from "@/lib/supabase/server";
import {
  isGuestSpeakerSlot,
  normalizeSpeakerSlots,
  type SacramentProgramBody,
  type SpeakerSlot,
} from "@/lib/sacramentProgram";
import { syncSustainingCallingsFromProgram } from "@/lib/sacrament/syncSustainingCallingsFromProgram";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { revalidatePath } from "next/cache";

const WARD_LEADERSHIP_ROLES = new Set(["bishop", "counselor", "clerk"]);

export type SaveSacramentInput = {
  wardId: string;
  date: string;
  theme: string | null;
  program: SacramentProgramBody;
  presiding_member_id: string | null;
  conducting_id: string | null;
  chorister_member_id: string | null;
  organist_member_id: string | null;
  opening_prayer_member_id: string | null;
  closing_prayer_member_id: string | null;
  opening_prayer_response_status?: string;
  opening_prayer_response_note?: string | null;
  opening_prayer_fulfilled?: boolean | null;
  closing_prayer_response_status?: string;
  closing_prayer_response_note?: string | null;
  closing_prayer_fulfilled?: boolean | null;
  speakers: SpeakerSlot[];
};

async function assertWardAccess(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId)) {
    throw new Error("Not authorized for this ward");
  }
}

export async function persistSacramentMeeting(
  input: SaveSacramentInput,
): Promise<{ ok: true; meetingId: string } | { ok: false; error: string }> {
  try {
    await assertWardAccess(input.wardId);
    const supabase = await createClient();

    const { data: upserted, error: upErr } = await supabase
      .from("sacrament_meetings")
      .upsert(
        {
          ward_id: input.wardId,
          date: input.date,
          theme: input.theme,
          program: input.program as unknown as Record<string, unknown>,
          presiding_member_id: input.presiding_member_id,
          conducting_id: input.conducting_id,
          chorister_member_id: input.chorister_member_id,
          organist_member_id: input.organist_member_id,
        },
        { onConflict: "ward_id,date" },
      )
      .select("id")
      .single();

    if (upErr) throw upErr;
    if (!upserted?.id) throw new Error("No meeting id after save");

    const meetingId = upserted.id as string;

    const { error: delPartErr } = await supabase.from("sacrament_participations").delete().eq("meeting_id", meetingId);
    if (delPartErr) throw delPartErr;

    const slots = normalizeSpeakerSlots(input.speakers)
      .filter((s) => s.position >= 1 && s.position <= 8)
      .sort((a, b) => a.position - b.position);

    const participationRows: {
      meeting_id: string;
      ward_id: string;
      slot: string;
      member_id: string | null;
      guest_name: string | null;
      topic: string | null;
      response_status: string;
      response_note: string | null;
      fulfilled: boolean | null;
    }[] = [];

    for (const s of slots) {
      const guestMode = isGuestSpeakerSlot(s);
      const guestName = guestMode ? (s.guest_name?.trim() ? s.guest_name.trim() : "") : null;
      participationRows.push({
        meeting_id: meetingId,
        ward_id: input.wardId,
        slot: `discourse_${s.position}`,
        member_id: guestMode ? null : s.member_id,
        guest_name: guestName,
        topic: s.topic ?? null,
        response_status: s.response_status ?? "pending",
        response_note: s.response_note ?? null,
        fulfilled: s.fulfilled ?? null,
      });
    }

    if (input.opening_prayer_member_id) {
      participationRows.push({
        meeting_id: meetingId,
        ward_id: input.wardId,
        slot: "opening_prayer",
        member_id: input.opening_prayer_member_id,
        guest_name: null,
        topic: null,
        response_status: input.opening_prayer_response_status ?? "pending",
        response_note: input.opening_prayer_response_note ?? null,
        fulfilled: input.opening_prayer_fulfilled ?? null,
      });
    }

    if (input.closing_prayer_member_id) {
      participationRows.push({
        meeting_id: meetingId,
        ward_id: input.wardId,
        slot: "closing_prayer",
        member_id: input.closing_prayer_member_id,
        guest_name: null,
        topic: null,
        response_status: input.closing_prayer_response_status ?? "pending",
        response_note: input.closing_prayer_response_note ?? null,
        fulfilled: input.closing_prayer_fulfilled ?? null,
      });
    }

    if (participationRows.length > 0) {
      const { error: insPartErr } = await supabase.from("sacrament_participations").insert(participationRows);
      if (insPartErr) throw insPartErr;
    }

    const roles = await fetchUserWardRoles();
    const canLead = roles.some((r) => r.ward_id === input.wardId && WARD_LEADERSHIP_ROLES.has(r.role));
    if (canLead) {
      await syncSustainingCallingsFromProgram(supabase, input.wardId, input.program);
      revalidatePath("/callings/proposed");
      revalidatePath("/callings");
    }

    revalidatePath("/sacrament");
    revalidatePath("/members");
    return { ok: true, meetingId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return { ok: false, error: msg };
  }
}
