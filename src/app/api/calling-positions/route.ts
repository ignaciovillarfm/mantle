import { assertWardLeadership } from "@/lib/serverRoles";
import { isCallingGroupKey } from "@/lib/callings/groupCallingOptions";
import { titleForCallingGroup } from "@/lib/callings/titleForCallingGroup";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Create a ward calling preset (catalog row), optionally scoped to an organization/group. */
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
  const rawTitle = trimStr(body.title);
  const groupKeyRaw = trimStr(body.groupKey);
  const groupKey = isCallingGroupKey(groupKeyRaw) ? groupKeyRaw : "other";

  if (!wardId || !rawTitle) {
    return NextResponse.json({ ok: false, error: "wardId and title are required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const title = titleForCallingGroup(groupKey, rawTitle);
  const supabase = await createClient();

  const { data: maxRow } = await supabase
    .from("calling_positions")
    .select("sort_order")
    .eq("ward_id", wardId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = typeof maxRow?.sort_order === "number" ? (maxRow.sort_order as number) + 10 : 1000;

  const { data: inserted, error: insErr } = await supabase
    .from("calling_positions")
    .insert({
      ward_id: wardId,
      title,
      sort_order: sortOrder,
    })
    .select("id, title, sort_order")
    .single();

  if (insErr) {
    const msg = insErr.message ?? "Insert failed";
    const status = msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate") ? 409 : 400;
    return NextResponse.json(
      {
        ok: false,
        error:
          status === 409
            ? "A calling with this title already exists in the ward"
            : msg,
      },
      { status },
    );
  }

  revalidatePath("/callings");
  revalidatePath("/sacrament");
  revalidatePath("/members");
  revalidatePath("/bishopric/organization");

  return NextResponse.json({
    ok: true,
    id: inserted?.id as string,
    title: inserted?.title as string,
    sort_order: inserted?.sort_order as number,
  });
}
