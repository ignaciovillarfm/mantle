import {
  buildDefaultAnnouncementText,
  sacramentAnnouncementWeeks,
  type WardCalendarActivity,
} from "@/lib/calendar/wardActivity";
import {
  DEFAULT_SACRAMENT_PROGRAM,
  parseAnnouncementRows,
  parseSacramentProgram,
  serializeAnnouncementRows,
} from "@/lib/sacramentProgram";
import type { SupabaseClient } from "@supabase/supabase-js";

function removeAnnouncementLine(rows: string[], lineToRemove: string | null | undefined): string[] {
  const target = lineToRemove?.trim();
  if (!target) return rows;
  return rows.filter((row) => row.trim() !== target);
}

export function resolveActivityAnnouncementText(
  activity: Pick<
    WardCalendarActivity,
    | "title"
    | "activity_date"
    | "start_time"
    | "end_time"
    | "location"
    | "notes"
    | "announcement_text"
  >,
): string {
  const custom = activity.announcement_text?.trim();
  if (custom) return custom;
  return buildDefaultAnnouncementText({
    title: activity.title,
    activityDate: activity.activity_date,
    startTime: activity.start_time,
    endTime: activity.end_time,
    location: activity.location,
    notes: activity.notes,
  });
}

async function upsertAnnouncementForWeek(
  supabase: SupabaseClient,
  wardId: string,
  sacramentWeek: string,
  lineToRemove: string | null,
  lineToAdd: string | null,
): Promise<void> {
  const { data: meeting, error: loadErr } = await supabase
    .from("sacrament_meetings")
    .select("id, program")
    .eq("ward_id", wardId)
    .eq("date", sacramentWeek)
    .maybeSingle();

  if (loadErr) throw loadErr;

  const program = meeting?.program
    ? parseSacramentProgram(meeting.program)
    : { ...DEFAULT_SACRAMENT_PROGRAM };

  let rows = parseAnnouncementRows(program.announcements);
  rows = removeAnnouncementLine(rows, lineToRemove);

  if (lineToAdd) {
    const trimmed = lineToAdd.trim();
    if (trimmed && !rows.some((row) => row.trim() === trimmed)) {
      rows.push(trimmed);
    }
  }

  program.announcements = serializeAnnouncementRows(rows);

  if (meeting?.id) {
    const { error: upErr } = await supabase
      .from("sacrament_meetings")
      .update({ program: program as unknown as Record<string, unknown> })
      .eq("id", meeting.id);
    if (upErr) throw upErr;
  } else if (lineToAdd?.trim()) {
    const { error: insErr } = await supabase.from("sacrament_meetings").insert({
      ward_id: wardId,
      date: sacramentWeek,
      program: program as unknown as Record<string, unknown>,
    });
    if (insErr) throw insErr;
  }
}

/** Adds or removes an activity announcement across the configured sacrament weeks. */
export async function syncActivitySacramentAnnouncement(
  supabase: SupabaseClient,
  wardId: string,
  activity: WardCalendarActivity,
  previousSyncedText: string | null,
  previousSyncedWeeks: string[],
): Promise<{ syncedText: string | null; syncedWeeks: string[] }> {
  const nextLine = activity.include_in_sacrament_program
    ? resolveActivityAnnouncementText(activity)
    : null;

  const targetWeeks = activity.include_in_sacrament_program
    ? sacramentAnnouncementWeeks(activity.activity_date, activity.announcement_weeks_before)
    : [];

  const weeksToClear = new Set([
    ...previousSyncedWeeks,
    ...targetWeeks,
  ]);

  for (const week of weeksToClear) {
    const shouldAdd = nextLine && targetWeeks.includes(week);
    await upsertAnnouncementForWeek(
      supabase,
      wardId,
      week,
      previousSyncedText,
      shouldAdd ? nextLine : null,
    );
  }

  return {
    syncedText: nextLine?.trim() || null,
    syncedWeeks: targetWeeks,
  };
}

/** Removes a previously synced announcement from all synced weeks when deleting an activity. */
export async function removeActivitySacramentAnnouncement(
  supabase: SupabaseClient,
  wardId: string,
  previousSyncedText: string | null,
  previousSyncedWeeks: string[],
): Promise<void> {
  if (!previousSyncedText?.trim() || previousSyncedWeeks.length === 0) return;

  for (const week of previousSyncedWeeks) {
    await upsertAnnouncementForWeek(supabase, wardId, week, previousSyncedText, null);
  }
}
