import {
  loadSacramentRolePool,
  SACRAMENT_ROLE_KEYS,
  type SacramentRoleKey,
  type SacramentRolePool,
} from "@/app/(ward)/sacrament/loadSacramentState";
import { createClient } from "@/lib/supabase/server";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { NextResponse } from "next/server";

async function assertWardAccess(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId)) {
    throw new Error("Not authorized for this ward");
  }
}

function parseRolePool(body: unknown): SacramentRolePool | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const pool = {} as SacramentRolePool;
  for (const key of SACRAMENT_ROLE_KEYS) {
    const value = raw[key];
    if (!Array.isArray(value)) return null;
    const ids = value.filter((v): v is string => typeof v === "string" && v.length > 0);
    pool[key] = [...new Set(ids)];
  }
  return pool;
}

export async function GET(req: Request) {
  const wardId = new URL(req.url).searchParams.get("wardId");
  if (!wardId) {
    return NextResponse.json({ error: "wardId is required" }, { status: 400 });
  }
  try {
    const rolePool = await loadSacramentRolePool(wardId);
    return NextResponse.json({ rolePool });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load role pool";
    const status = msg.includes("Not authorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const wardId =
    body && typeof body === "object" && typeof (body as { wardId?: unknown }).wardId === "string"
      ? (body as { wardId: string }).wardId
      : null;
  const rolePool = parseRolePool(
    body && typeof body === "object" ? (body as { rolePool?: unknown }).rolePool : null,
  );

  if (!wardId || !rolePool) {
    return NextResponse.json({ error: "wardId and rolePool are required" }, { status: 400 });
  }

  try {
    await assertWardAccess(wardId);
    const supabase = await createClient();

    const { data: wardMembers } = await supabase.from("members").select("id").eq("ward_id", wardId);
    const memberIds = new Set((wardMembers ?? []).map((m) => m.id as string));

    for (const key of SACRAMENT_ROLE_KEYS) {
      for (const memberId of rolePool[key]) {
        if (!memberIds.has(memberId)) {
          return NextResponse.json({ error: `Invalid member for role ${key}` }, { status: 400 });
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("sacrament_role_pool_members")
      .delete()
      .eq("ward_id", wardId);
    if (deleteError) throw new Error(deleteError.message);

    const rows: { ward_id: string; role_key: SacramentRoleKey; member_id: string; sort_order: number }[] =
      [];
    for (const key of SACRAMENT_ROLE_KEYS) {
      rolePool[key].forEach((memberId, index) => {
        rows.push({ ward_id: wardId, role_key: key, member_id: memberId, sort_order: index });
      });
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("sacrament_role_pool_members").insert(rows);
      if (insertError) throw new Error(insertError.message);
    }

    return NextResponse.json({ rolePool });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save role pool";
    const status = msg.includes("Not authorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
