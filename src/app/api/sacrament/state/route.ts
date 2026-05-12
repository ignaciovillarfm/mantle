import { loadSacramentPageState } from "@/app/(ward)/sacrament/loadSacramentState";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wardId = searchParams.get("wardId");
  const date = searchParams.get("date");
  if (!wardId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "wardId and date (YYYY-MM-DD) are required" }, { status: 400 });
  }

  try {
    const data = await loadSacramentPageState(wardId, date);
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load sacrament state";
    const status = msg.includes("Not authorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
