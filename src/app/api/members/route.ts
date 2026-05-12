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
  const firstName = trimStr(body.firstName);
  const lastName = trimStr(body.lastName);
  const legacyName = trimStr(body.name);
  const isYouth = body.isYouth === true;
  const organizationIdIn = trimStr(body.organizationId);
  const callingPositionIdIn = trimStr(body.callingPositionId);

  let displayName = "";
  if (firstName || lastName) {
    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "Both firstName and lastName are required when using split names" },
        { status: 400 },
      );
    }
    displayName = `${firstName} ${lastName}`;
  } else if (legacyName) {
    displayName = legacyName;
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide firstName and lastName (or legacy name)" },
      { status: 400 },
    );
  }

  if (!wardId) {
    return NextResponse.json({ ok: false, error: "wardId is required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const supabase = await createClient();
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "add-member-calling-debug-1",
      hypothesisId: "H2",
      location: "api/members/route.ts:validatedInput",
      message: "Validated member create request",
      data: {
        wardId,
        hasCallingPositionId: Boolean(callingPositionIdIn),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion


  let organizationId = organizationIdIn;
  if (!organizationId) {
    const { data: orgRow, error: orgPickErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("ward_id", wardId)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (orgPickErr || !orgRow) {
      return NextResponse.json(
        { ok: false, error: "No organization found for this ward; create one in admin first" },
        { status: 400 },
      );
    }
    organizationId = orgRow.id as string;
  } else {
    const { data: orgRow, error: orgErr } = await supabase
      .from("organizations")
      .select("ward_id")
      .eq("id", organizationId)
      .maybeSingle();

    if (orgErr || !orgRow || (orgRow.ward_id as string) !== wardId) {
      return NextResponse.json(
        { ok: false, error: "Organization must belong to the selected ward" },
        { status: 400 },
      );
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("members")
    .insert({
      ward_id: wardId,
      organization_id: organizationId,
      name: displayName,
      is_youth: isYouth,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 400 });
  }

  if (callingPositionIdIn) {
    const { data: pos, error: posErr } = await supabase
      .from("calling_positions")
      .select("id, title, ward_id")
      .eq("id", callingPositionIdIn)
      .maybeSingle();

    if (posErr || !pos || (pos.ward_id as string) !== wardId) {
      return NextResponse.json(
        { ok: false, error: "Invalid calling preset for this ward" },
        { status: 400 },
      );
    }

    const { error: callErr } = await supabase.from("callings").insert({
      ward_id: wardId,
      member_id: (inserted?.id as string) ?? null,
      name: pos.title as string,
      calling_position_id: pos.id as string,
      status: "Set Apart",
    });

    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "add-member-calling-debug-1",
        hypothesisId: "H3",
        location: "api/members/route.ts:createCalling",
        message: "Optional calling create result",
        data: {
          memberId: inserted?.id as string,
          callingPositionId: callingPositionIdIn,
          success: !callErr,
          hasError: Boolean(callErr),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (callErr) {
      return NextResponse.json({ ok: false, error: callErr.message }, { status: 400 });
    }
  }

  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "add-member-calling-debug-1",
      hypothesisId: "H4",
      location: "api/members/route.ts:response",
      message: "Returning success from member create",
      data: {
        memberId: inserted?.id as string,
        withCalling: Boolean(callingPositionIdIn),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  revalidatePath("/members");
  return NextResponse.json({ ok: true, id: inserted?.id as string });
}
