import { normalizeRideContactRow } from "@/lib/sacrament/breadAssignment";
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
  const name = trimStr(body.name) || null;
  const phone = trimStr(body.phone) || null;

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();

  if (!name && !phone) {
    const { error: delErr } = await supabase
      .from("sacrament_bread_ride_contacts")
      .delete()
      .eq("ward_id", wardId);

    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
    }

    revalidatePath("/bishopric/sacrament-bread");
    return NextResponse.json({ ok: true, rideContact: null });
  }

  const { data, error } = await supabase
    .from("sacrament_bread_ride_contacts")
    .upsert({ ward_id: wardId, name, phone }, { onConflict: "ward_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  revalidatePath("/bishopric/sacrament-bread");
  return NextResponse.json({
    ok: true,
    rideContact: normalizeRideContactRow(data as Record<string, unknown>),
  });
}
