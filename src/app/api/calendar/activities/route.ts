import {
  normalizeActivityRow,
  type AnnouncementWeeksBefore,
  ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS,
  type WardActivityCategory,
  WARD_ACTIVITY_CATEGORIES,
  type WardActivityFormInput,
} from "@/lib/calendar/wardActivity";
import {
  removeActivitySacramentAnnouncement,
  syncActivitySacramentAnnouncement,
} from "@/lib/calendar/syncActivityToSacrament";
import { assertWardLeadership } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function parseTime(v: unknown): string | null {
  const s = trimStr(v);
  if (!s) return null;
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0, 5);
  return null;
}

function parseAnnouncementWeeksBefore(v: unknown): AnnouncementWeeksBefore {
  const n = typeof v === "number" ? v : Number(v);
  return ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS.includes(n as AnnouncementWeeksBefore)
    ? (n as AnnouncementWeeksBefore)
    : 1;
}

function parseSyncedWeeks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x));
}

function parseCategory(v: unknown): WardActivityCategory {
  const s = trimStr(v);
  return WARD_ACTIVITY_CATEGORIES.includes(s as WardActivityCategory)
    ? (s as WardActivityCategory)
    : "activity";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wardId = trimStr(url.searchParams.get("wardId"));
  const month = trimStr(url.searchParams.get("month"));

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ ok: false, error: "month (YYYY-MM) is required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const [year, monthNum] = month.split("-").map(Number);
  const start = `${month}-01`;
  const endDay = new Date(year, monthNum, 0).getDate();
  const end = `${month}-${String(endDay).padStart(2, "0")}`;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ward_calendar_activities")
    .select("*")
    .eq("ward_id", wardId)
    .gte("activity_date", start)
    .lte("activity_date", end)
    .order("activity_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    activities: (data ?? []).map((row) => normalizeActivityRow(row as Record<string, unknown>)),
  });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const input: WardActivityFormInput = {
    id: trimStr(body.id) || undefined,
    wardId: trimStr(body.wardId),
    activityDate: trimStr(body.activityDate),
    title: trimStr(body.title),
    notes: trimStr(body.notes) || null,
    location: trimStr(body.location) || null,
    startTime: parseTime(body.startTime),
    endTime: parseTime(body.endTime),
    category: parseCategory(body.category),
    organizerMemberId: trimStr(body.organizerMemberId) || null,
    includeInSacramentProgram: body.includeInSacramentProgram === true,
    announcementWeeksBefore: parseAnnouncementWeeksBefore(body.announcementWeeksBefore),
    announcementText: trimStr(body.announcementText) || null,
  };

  if (!input.wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  if (!input.activityDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.activityDate)) {
    return NextResponse.json({ ok: false, error: "activityDate (YYYY-MM-DD) is required" }, { status: 400 });
  }
  if (!input.title) {
    return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(input.wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();
  let previousSyncedText: string | null = null;
  let previousSyncedWeeks: string[] = [];

  if (input.id) {
    const { data: existing, error: loadErr } = await supabase
      .from("ward_calendar_activities")
      .select("ward_id, last_synced_announcement_text, last_synced_sacrament_weeks")
      .eq("id", input.id)
      .maybeSingle();

    if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 400 });
    if (!existing || (existing.ward_id as string) !== input.wardId) {
      return NextResponse.json({ ok: false, error: "Activity not found" }, { status: 404 });
    }
    previousSyncedText =
      typeof existing.last_synced_announcement_text === "string"
        ? existing.last_synced_announcement_text
        : null;
    previousSyncedWeeks = parseSyncedWeeks(existing.last_synced_sacrament_weeks);
  }

  const rowPayload = {
    ward_id: input.wardId,
    activity_date: input.activityDate,
    title: input.title,
    notes: input.notes,
    location: input.location,
    start_time: input.startTime,
    end_time: input.endTime,
    category: input.category ?? "activity",
    organizer_member_id: input.organizerMemberId,
    include_in_sacrament_program: input.includeInSacramentProgram === true,
    announcement_weeks_before: input.announcementWeeksBefore ?? 1,
    announcement_text: input.announcementText,
  };

  let savedRow: Record<string, unknown> | null = null;

  if (input.id) {
    const { data, error } = await supabase
      .from("ward_calendar_activities")
      .update(rowPayload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    savedRow = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabase
      .from("ward_calendar_activities")
      .insert(rowPayload)
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    savedRow = data as Record<string, unknown>;
  }

  const activity = normalizeActivityRow(savedRow);

  // The activity row is already committed. Announcement syncing is a secondary
  // effect, so a failure here must not report the save as failed — otherwise the
  // user retries and creates duplicates.
  let syncWarning: string | null = null;
  let syncedActivity = activity;

  try {
    const { syncedText, syncedWeeks } = await syncActivitySacramentAnnouncement(
      supabase,
      input.wardId,
      activity,
      previousSyncedText,
      previousSyncedWeeks,
    );

    const { data: finalRow, error: syncErr } = await supabase
      .from("ward_calendar_activities")
      .update({
        last_synced_announcement_text: syncedText,
        last_synced_sacrament_weeks: syncedWeeks,
      })
      .eq("id", activity.id)
      .eq("ward_id", input.wardId)
      .select("*")
      .single();

    if (syncErr) {
      syncWarning = syncErr.message;
    } else if (finalRow) {
      syncedActivity = normalizeActivityRow(finalRow as Record<string, unknown>);
    }
  } catch (e) {
    syncWarning =
      e instanceof Error ? e.message : "Failed to sync sacrament announcement";
  }

  revalidatePath("/calendar");
  revalidatePath("/sacrament");

  return NextResponse.json({
    ok: true,
    activity: syncedActivity,
    ...(syncWarning ? { warning: syncWarning } : {}),
  });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = trimStr(url.searchParams.get("id"));
  const wardId = trimStr(url.searchParams.get("wardId"));

  if (!id || !wardId) {
    return NextResponse.json({ ok: false, error: "id and wardId are required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: existing, error: loadErr } = await supabase
    .from("ward_calendar_activities")
    .select("*")
    .eq("id", id)
    .eq("ward_id", wardId)
    .maybeSingle();

  if (loadErr) return NextResponse.json({ ok: false, error: loadErr.message }, { status: 400 });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Activity not found" }, { status: 404 });
  }

  const activity = normalizeActivityRow(existing as Record<string, unknown>);

  let syncWarning: string | null = null;
  try {
    await removeActivitySacramentAnnouncement(
      supabase,
      wardId,
      activity.last_synced_announcement_text,
      activity.last_synced_sacrament_weeks,
    );
  } catch (e) {
    syncWarning =
      e instanceof Error ? e.message : "Failed to remove sacrament announcement";
  }

  const { error: delErr } = await supabase
    .from("ward_calendar_activities")
    .delete()
    .eq("id", id)
    .eq("ward_id", wardId);

  if (delErr) return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });

  revalidatePath("/calendar");
  revalidatePath("/sacrament");

  return NextResponse.json({ ok: true, ...(syncWarning ? { warning: syncWarning } : {}) });
}
