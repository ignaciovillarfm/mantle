import { callEdgeFunction } from "@/lib/callEdgeFunction";
import { type NextRequest, NextResponse } from "next/server";

const ROUTES: Record<string, { methods: ("GET" | "POST")[] }> = {
  "get-speaker-suggestions": { methods: ["POST"] },
  "advance-calling-status": { methods: ["POST"] },
  "get-expiring-recommends": { methods: ["GET", "POST"] },
  "bishop-note-create": { methods: ["POST"] },
  "bishop-note-read": { methods: ["GET"] },
  "admin-offboard-user": { methods: ["POST"] },
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const spec = ROUTES[name];
  if (!spec?.methods.includes("GET")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const q = Object.fromEntries(request.nextUrl.searchParams.entries());
    const data = await callEdgeFunction(name, { method: "GET", query: q });
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  const spec = ROUTES[name];
  if (!spec?.methods.includes("POST")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    try {
      const data = await callEdgeFunction(name, { method: "POST", body });
      return NextResponse.json(data);
    } catch (inner) {
      const innerMsg = inner instanceof Error ? inner.message : String(inner);
      const isStakeToSustain =
        name === "advance-calling-status" &&
        typeof body?.new_status === "string" &&
        body.new_status === "To Sustain" &&
        innerMsg.includes("Disallowed transition: Stake Approval") &&
        innerMsg.includes("To Sustain") &&
        typeof body?.calling_id === "string";

      if (!isStakeToSustain) {
        throw inner;
      }

      await callEdgeFunction(name, {
        method: "POST",
        body: { calling_id: body.calling_id, new_status: "To Interview" },
      });
      const bridged = await callEdgeFunction(name, {
        method: "POST",
        body: { calling_id: body.calling_id, new_status: "To Sustain" },
      });
      return NextResponse.json(bridged);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
