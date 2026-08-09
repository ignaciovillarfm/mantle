import {
  normalizeYouthActivityRow,
  YOUTH_QUORUMS,
  type YouthActivityFormInput,
  type YouthQuorum,
} from "@/lib/youth/youthActivity";
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

function parseQuorum(v: unknown): YouthQuorum {
  const s = trimStr(v);
  return YOUTH_QUORUMS.includes(s as YouthQuorum) ? (s as YouthQuorum) : "combined";
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
    .from("youth_activities")
    .select("*")
    .eq("ward_id", wardId)
    .order("activity_date", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    activities: (data ?? []).map((row) => normalizeYouthActivityRow(row as Record<string, unknown>)),
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

  // Bulk import
  if (Array.isArray(body.activities)) {
    const wardId = trimStr(body.wardId);
    if (!wardId) {
      return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
    }
    try {
      await assertWardLeadership(wardId);
    } catch {
      return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
    }

    const rows = body.activities
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => {
        const activityDate = parseDate(item.activityDate);
        const title = trimStr(item.title);
        if (!activityDate || !title) return null;
        const parsedEnd = parseDate(item.endDate);
        const endDate = parsedEnd && parsedEnd >= activityDate ? parsedEnd : null;
        return {
          ward_id: wardId,
          activity_date: activityDate,
          end_date: endDate,
          title,
          quorum: parseQuorum(item.quorum),
          youth_in_charge: trimStr(item.youthInCharge) || null,
          youth_member_id: trimStr(item.youthMemberId) || null,
          notes: trimStr(item.notes) || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No valid activities to import" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.from("youth_activities").insert(rows).select("*");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

    revalidatePath("/bishopric/youth-activities");
    return NextResponse.json({
      ok: true,
      activities: (data ?? []).map((row) =>
        normalizeYouthActivityRow(row as Record<string, unknown>),
      ),
    });
  }

  const input: YouthActivityFormInput = {
    id: trimStr(body.id) || undefined,
    wardId: trimStr(body.wardId),
    activityDate: parseDate(body.activityDate) ?? "",
    endDate: parseDate(body.endDate),
    title: trimStr(body.title),
    quorum: parseQuorum(body.quorum),
    youthInCharge: trimStr(body.youthInCharge) || null,
    youthMemberId: trimStr(body.youthMemberId) || null,
    notes: trimStr(body.notes) || null,
  };

  if (!input.wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }
  if (!input.activityDate) {
    return NextResponse.json({ ok: false, error: "activityDate (YYYY-MM-DD) is required" }, { status: 400 });
  }
  if (!input.title) {
    return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
  }
  if (input.endDate && input.endDate < input.activityDate) {
    return NextResponse.json({ ok: false, error: "endDate must be on or after activityDate" }, { status: 400 });
  }

  try {
    await assertWardLeadership(input.wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();
  const rowPayload = {
    ward_id: input.wardId,
    activity_date: input.activityDate,
    end_date: input.endDate,
    title: input.title,
    quorum: input.quorum,
    youth_in_charge: input.youthInCharge,
    youth_member_id: input.youthMemberId,
    notes: input.notes,
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("youth_activities")
      .update(rowPayload)
      .eq("id", input.id)
      .eq("ward_id", input.wardId)
      .select("*")
      .single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    revalidatePath("/bishopric/youth-activities");
    return NextResponse.json({
      ok: true,
      activity: normalizeYouthActivityRow(data as Record<string, unknown>),
    });
  }

  const { data, error } = await supabase
    .from("youth_activities")
    .insert(rowPayload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  revalidatePath("/bishopric/youth-activities");
  return NextResponse.json({
    ok: true,
    activity: normalizeYouthActivityRow(data as Record<string, unknown>),
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
    .from("youth_activities")
    .delete()
    .eq("id", id)
    .eq("ward_id", wardId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  revalidatePath("/bishopric/youth-activities");
  return NextResponse.json({ ok: true });
}
