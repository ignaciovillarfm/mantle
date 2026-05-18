import { revokeWardInvite } from "@/lib/wardInvitesServer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { invite_id?: string };
    const inviteId = body.invite_id?.trim();
    if (!inviteId) {
      return NextResponse.json({ error: "invite_id required" }, { status: 400 });
    }
    await revokeWardInvite(inviteId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    const status =
      msg === "Not authorized for this ward"
        ? 403
        : msg === "Invite not found"
          ? 404
          : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
