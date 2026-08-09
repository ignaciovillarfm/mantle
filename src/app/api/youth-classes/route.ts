import {
  normalizeYouthClassAssignmentRow,
  parseYouthClass,
} from "@/lib/youth/youthClassAssignment";
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
    .from("youth_class_assignments")
    .select("*")
    .eq("ward_id", wardId)
    .order("sunday_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    assignments: (data ?? []).map((row) =>
      normalizeYouthClassAssignmentRow(row as Record<string, unknown>),
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
  const quorum = parseYouthClass(body.quorum);
  const memberId = trimStr(body.memberId) || null;
  const teacherName = trimStr(body.teacherName) || null;
  const topic = trimStr(body.topic) || null;
  const notes = trimStr(body.notes) || null;

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

  if (!memberId && !teacherName && !topic && !notes) {
    const { error: delErr } = await supabase
      .from("youth_class_assignments")
      .delete()
      .eq("ward_id", wardId)
      .eq("sunday_date", sundayDate)
      .eq("quorum", quorum);

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
    }

    revalidatePath("/bishopric/youth-classes");
    return NextResponse.json({ ok: true, assignment: null });
  }

  const { data, error } = await supabase
    .from("youth_class_assignments")
    .upsert(
      {
        ward_id: wardId,
        sunday_date: sundayDate,
        quorum,
        member_id: memberId,
        teacher_name: teacherName,
        topic,
        notes,
      },
      { onConflict: "ward_id,sunday_date,quorum" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  revalidatePath("/bishopric/youth-classes");
  return NextResponse.json({
    ok: true,
    assignment: normalizeYouthClassAssignmentRow(data as Record<string, unknown>),
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
  const { error } = await supabase
    .from("youth_class_assignments")
    .delete()
    .eq("id", id)
    .eq("ward_id", wardId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  revalidatePath("/bishopric/youth-classes");
  return NextResponse.json({ ok: true });
}
