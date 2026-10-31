import { assertWardLeadership } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** List pending calling import suggestions for a ward. */
export async function GET(req: Request) {
  const wardId = new URL(req.url).searchParams.get("wardId")?.trim() ?? "";
  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calling_import_suggestions")
    .select(
      "id, member_id, member_name_raw, organization_raw, calling_title_raw, suggested_position_id, suggested_position_title, match_score, sustained_date, status, created_at, members ( name )",
    )
    .eq("ward_id", wardId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, suggestions: data ?? [] });
}

/**
 * Approve or reject a suggestion.
 * Body: { suggestionId, action: "approve" | "reject", memberId?, callingPositionId? }
 */
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

  const suggestionId = trimStr(body.suggestionId);
  const action = trimStr(body.action);
  if (!suggestionId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json(
      { ok: false, error: "suggestionId and action (approve|reject) are required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data: row, error: rowErr } = await supabase
    .from("calling_import_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .maybeSingle();

  if (rowErr || !row) {
    return NextResponse.json({ ok: false, error: "Suggestion not found" }, { status: 404 });
  }

  const wardId = row.ward_id as string;
  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized" }, { status: 403 });
  }

  if ((row.status as string) !== "pending") {
    return NextResponse.json({ ok: false, error: "Suggestion already resolved" }, { status: 400 });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("calling_import_suggestions")
      .update({ status: "rejected" })
      .eq("id", suggestionId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const memberId = trimStr(body.memberId) || (row.member_id as string | null) || "";
  const positionId =
    trimStr(body.callingPositionId) || (row.suggested_position_id as string | null) || "";

  if (!memberId || !positionId) {
    return NextResponse.json(
      { ok: false, error: "memberId and callingPositionId are required to approve" },
      { status: 400 },
    );
  }

  const { data: pos, error: posErr } = await supabase
    .from("calling_positions")
    .select("id, title, ward_id")
    .eq("id", positionId)
    .maybeSingle();

  if (posErr || !pos || (pos.ward_id as string) !== wardId) {
    return NextResponse.json({ ok: false, error: "Invalid position for this ward" }, { status: 400 });
  }

  const { data: mem } = await supabase
    .from("members")
    .select("id, ward_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!mem || (mem.ward_id as string) !== wardId) {
    return NextResponse.json({ ok: false, error: "Invalid member for this ward" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("callings")
    .select("id")
    .eq("ward_id", wardId)
    .eq("member_id", memberId)
    .eq("calling_position_id", positionId)
    .eq("status", "Set Apart")
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await supabase.from("callings").insert({
      ward_id: wardId,
      member_id: memberId,
      name: pos.title as string,
      calling_position_id: pos.id as string,
      status: "Set Apart",
    });
    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
    }
  }

  const { error: upErr } = await supabase
    .from("calling_import_suggestions")
    .update({
      status: "approved",
      member_id: memberId,
      suggested_position_id: positionId,
      suggested_position_title: pos.title as string,
    })
    .eq("id", suggestionId);

  if (upErr) {
    return NextResponse.json({ ok: false, error: upErr.message }, { status: 400 });
  }

  revalidatePath("/callings");
  revalidatePath("/callings/import");
  return NextResponse.json({ ok: true, status: "approved" });
}
