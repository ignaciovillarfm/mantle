import { buildApplyPreviousWeekDraft } from "@/app/(ward)/sacrament/applyPreviousWeekDraft";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const wardId = typeof o.wardId === "string" ? o.wardId : null;
  const forMeetingDate = typeof o.forMeetingDate === "string" ? o.forMeetingDate : null;
  if (!wardId || !forMeetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(forMeetingDate)) {
    return NextResponse.json(
      { ok: false, error: "wardId and forMeetingDate (YYYY-MM-DD) are required" },
      { status: 400 },
    );
  }

  const result = await buildApplyPreviousWeekDraft(wardId, forMeetingDate);

  if (!result.ok) {
    const status = result.error.includes("Not authorized") ? 403 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
