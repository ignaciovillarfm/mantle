import { normalizeBreadAssignmentRow } from "@/lib/sacrament/breadAssignment";
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

function parseDate(v: unknown): string | null {
  const s = trimStr(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const wardId = trimStr(url.searchParams.get("wardId"));

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sacrament_bread_assignments")
    .select("*")
    .eq("ward_id", wardId)
    .order("sunday_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    assignments: (data ?? []).map((row) =>
      normalizeBreadAssignmentRow(row as Record<string, unknown>),
    ),
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

  const wardId = trimStr(body.wardId);
  const sundayDate = parseDate(body.sundayDate);
  const memberId = trimStr(body.memberId) || null;
  const assignedTo = trimStr(body.assignedTo) || null;
  const phone = trimStr(body.phone) || null;
  const reminderPreference = trimStr(body.reminderPreference) || null;
  const notes = trimStr(body.notes) || null;
  const confirmed = body.confirmed === true;

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  if (!sundayDate) {
    return NextResponse.json(
      { ok: false, error: "sundayDate (YYYY-MM-DD) is required" },
      { status: 400 },
    );
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();

  // Clearing both the member and the free-text name means the Sunday is unassigned,
  // so drop the row instead of keeping an empty one around.
  if (!memberId && !assignedTo && !phone && !reminderPreference && !notes) {
    const { error: delErr } = await supabase
      .from("sacrament_bread_assignments")
      .delete()
      .eq("ward_id", wardId)
      .eq("sunday_date", sundayDate);

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
    }

    revalidatePath("/bishopric/sacrament-bread");
    return NextResponse.json({ ok: true, assignment: null });
  }

  const { data, error } = await supabase
    .from("sacrament_bread_assignments")
    .upsert(
      {
        ward_id: wardId,
        sunday_date: sundayDate,
        member_id: memberId,
        assigned_to: assignedTo,
        phone,
        reminder_preference: reminderPreference,
        notes,
        confirmed,
      },
      { onConflict: "ward_id,sunday_date" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  revalidatePath("/bishopric/sacrament-bread");
  return NextResponse.json({
    ok: true,
    assignment: normalizeBreadAssignmentRow(data as Record<string, unknown>),
  });
}
