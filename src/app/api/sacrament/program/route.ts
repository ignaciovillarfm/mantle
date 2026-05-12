import { persistSacramentMeeting, type SaveSacramentInput } from "@/lib/sacrament/persistSacramentMeeting";
import { NextResponse } from "next/server";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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

  const wardId = typeof body.wardId === "string" ? body.wardId : null;
  const date = typeof body.date === "string" ? body.date : null;
  if (!wardId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "wardId and date (YYYY-MM-DD) are required" }, { status: 400 });
  }

  const input = body as unknown as SaveSacramentInput;
  const result = await persistSacramentMeeting(input);

  if (!result.ok) {
    const status = result.error.includes("Not authorized") ? 403 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
