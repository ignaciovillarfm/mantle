import { assertWardLeadership } from "@/lib/serverRoles";
import { normalizeMemberNameForCompare } from "@/lib/members/normalizeMemberName";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const id = trimStr(body.id);
  const name = trimStr(body.name);

  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }
  if (typeof body.isYouth !== "boolean") {
    return NextResponse.json({ ok: false, error: "isYouth must be a boolean" }, { status: 400 });
  }
  const isYouth = body.isYouth;

  const supabase = await createClient();

  // The member's own ward is the source of truth, so a client cannot move a
  // member into a ward it happens to have access to.
  const { data: existing, error: loadErr } = await supabase
    .from("members")
    .select("id, ward_id")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return NextResponse.json({ ok: false, error: loadErr.message }, { status: 400 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });
  }

  const wardId = existing.ward_id as string;

  try {
    await assertWardLeadership(wardId);
  } catch {
    return NextResponse.json({ ok: false, error: "Not authorized for this ward" }, { status: 403 });
  }

  const { data: wardMembers, error: dupErr } = await supabase
    .from("members")
    .select("id, name")
    .eq("ward_id", wardId);

  if (dupErr) {
    return NextResponse.json({ ok: false, error: dupErr.message }, { status: 400 });
  }

  const normalizedNext = normalizeMemberNameForCompare(name);
  const duplicate = (wardMembers ?? []).find(
    (m) =>
      (m.id as string) !== id &&
      normalizeMemberNameForCompare(String(m.name ?? "")) === normalizedNext,
  );
  if (duplicate) {
    return NextResponse.json(
      {
        ok: false,
        error: "Another member with this name already exists in the ward",
        duplicateId: duplicate.id,
      },
      { status: 409 },
    );
  }

  const { data: updated, error: updErr } = await supabase
    .from("members")
    .update({ name, is_youth: isYouth })
    .eq("id", id)
    .eq("ward_id", wardId)
    .select("id, name, is_youth")
    .single();

  if (updErr) {
    return NextResponse.json({ ok: false, error: updErr.message }, { status: 400 });
  }

  revalidatePath("/members");
  return NextResponse.json({
    ok: true,
    member: {
      id: updated.id as string,
      name: updated.name as string,
      is_youth: Boolean(updated.is_youth),
    },
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

  const { data: existingMembers, error: dupErr } = await supabase
    .from("members")
    .select("id, name")
    .eq("ward_id", wardId);

  if (dupErr) {
    return NextResponse.json({ ok: false, error: dupErr.message }, { status: 400 });
  }

  const normalizedNew = normalizeMemberNameForCompare(displayName);
  const duplicate = (existingMembers ?? []).find(
    (m) => normalizeMemberNameForCompare(String(m.name ?? "")) === normalizedNew,
  );
  if (duplicate) {
    return NextResponse.json(
      { ok: false, error: "A member with this name already exists in the ward", duplicateId: duplicate.id },
      { status: 409 },
    );
  }

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

    if (callErr) {
      return NextResponse.json({ ok: false, error: callErr.message }, { status: 400 });
    }
  }

  revalidatePath("/members");
  return NextResponse.json({ ok: true, id: inserted?.id as string });
}
