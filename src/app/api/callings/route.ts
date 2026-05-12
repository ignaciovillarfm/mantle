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

/**
 * Create a calling assignment for an existing member from canonical preset list.
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

  const wardId = trimStr(body.wardId);
  const memberId = trimStr(body.memberId);
  const positionId = trimStr(body.callingPositionId);
  const requestedStatusRaw = trimStr(body.status);
  const requestedStatus =
    requestedStatusRaw === "Proposed" || requestedStatusRaw === "Set Apart"
      ? requestedStatusRaw
      : "Set Apart";

  if (!wardId || !memberId || !positionId) {
    return NextResponse.json(
      { ok: false, error: "wardId, memberId, and callingPositionId are required" },
      { status: 400 },
    );
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: mem, error: memErr } = await supabase
    .from("members")
    .select("ward_id")
    .eq("id", memberId)
    .maybeSingle();

  if (memErr || !mem || (mem.ward_id as string) !== wardId) {
    return NextResponse.json({ ok: false, error: "Member must belong to the selected ward" }, { status: 400 });
  }

  const { data: pos, error: posErr } = await supabase
    .from("calling_positions")
    .select("id, title, ward_id")
    .eq("id", positionId)
    .maybeSingle();

  if (posErr || !pos || (pos.ward_id as string) !== wardId) {
    return NextResponse.json({ ok: false, error: "Invalid calling preset for this ward" }, { status: 400 });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("callings")
    .insert({
      ward_id: wardId,
      member_id: memberId,
      name: pos.title as string,
      calling_position_id: pos.id as string,
      status: requestedStatus,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
  }

  revalidatePath("/callings");
  revalidatePath("/callings/proposed");
  return NextResponse.json({ ok: true, id: inserted?.id as string });
}

export async function DELETE(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const callingId = trimStr(body.callingId);
  if (!callingId) {
    return NextResponse.json({ ok: false, error: "callingId is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: row, error: rowErr } = await supabase
    .from("callings")
    .select("id, ward_id, status")
    .eq("id", callingId)
    .maybeSingle();
  if (rowErr || !row) {
    return NextResponse.json({ ok: false, error: "Calling not found" }, { status: 404 });
  }
  if ((row.status as string) === "Set Apart") {
    return NextResponse.json({ ok: false, error: "Cannot remove a set apart calling" }, { status: 400 });
  }
  try {
    await assertWardLeadership(row.ward_id as string);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const { error: delErr } = await supabase.from("callings").delete().eq("id", callingId);
  if (delErr) {
    return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
  }
  revalidatePath("/callings");
  revalidatePath("/callings/proposed");
  return NextResponse.json({ ok: true });
}
