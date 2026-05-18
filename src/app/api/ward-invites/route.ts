import { getShareableSiteOrigin } from "@/lib/publicOrigin";
import { createWardInvite, listWardInvites } from "@/lib/wardInvitesServer";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const wardId = new URL(req.url).searchParams.get("ward_id")?.trim();
    if (!wardId) {
      return NextResponse.json({ error: "ward_id required" }, { status: 400 });
    }
    const invites = await listWardInvites(wardId);
    return NextResponse.json({ ok: true, invites });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status =
      msg === "Not authorized for this ward"
        ? 403
        : msg === "Unauthorized"
          ? 401
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { ward_id?: string; email?: string; role?: string };
    const wardId = body.ward_id?.trim();
    const email = body.email ?? "";
    const role = body.role?.trim() ?? "";
    if (!wardId) {
      return NextResponse.json({ error: "ward_id required" }, { status: 400 });
    }
    const hdrs = await headers();
    const loginOrigin = getShareableSiteOrigin(hdrs);
    const result = await createWardInvite(wardId, email, role, { loginOrigin });
    return NextResponse.json({
      ok: true,
      invite: { id: result.id, expires_at: result.expires_at },
      emailSent: result.emailSent,
      emailError: result.emailError,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status =
      msg === "Not authorized for this ward"
        ? 403
        : msg.includes("already")
          ? 409
          : msg.includes("Valid email")
            ? 400
            : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
