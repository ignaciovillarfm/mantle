import { PROGRAM_TEMPLATE_KEYS } from "@/lib/sacrament/programTemplates";
import { loadProgramTemplatesForWard } from "@/lib/sacrament/loadProgramTemplates";
import { assertWardLeadership, fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LangBody = { en: string; es: string };

function isLangBody(v: unknown): v is LangBody {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as LangBody).en === "string" &&
    typeof (v as LangBody).es === "string"
  );
}

async function assertWardMember(wardId: string): Promise<void> {
  const roles = await fetchUserWardRoles();
  if (!roles.some((r) => r.ward_id === wardId)) {
    throw new Error("Not authorized for this ward");
  }
}

export async function GET(req: Request) {
  const wardId = new URL(req.url).searchParams.get("wardId");
  if (!wardId) {
    return NextResponse.json({ error: "wardId is required" }, { status: 400 });
  }

  try {
    await assertWardMember(wardId);
    const { defaults, templates } = await loadProgramTemplatesForWard(wardId);
    return NextResponse.json({ defaults, overrides: {}, templates });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load templates";
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
  const rawTemplates =
    body && typeof body === "object" ? (body as { templates?: unknown }).templates : null;

  if (!wardId || !rawTemplates || typeof rawTemplates !== "object") {
    return NextResponse.json({ error: "wardId and templates are required" }, { status: 400 });
  }

  try {
    await assertWardLeadership(wardId);
    const supabase = await createClient();

    const rows: { ward_id: string; template_key: string; lang: "en" | "es"; body: string }[] = [];
    for (const key of PROGRAM_TEMPLATE_KEYS) {
      const entry = (rawTemplates as Record<string, unknown>)[key];
      if (!isLangBody(entry)) {
        return NextResponse.json({ error: `Invalid template: ${key}` }, { status: 400 });
      }
      const en = entry.en.trim();
      const es = entry.es.trim();
      if (!en && !es) {
        return NextResponse.json({ error: `Empty template: ${key}` }, { status: 400 });
      }
      if (en) rows.push({ ward_id: wardId, template_key: key, lang: "en", body: en });
      if (es) rows.push({ ward_id: wardId, template_key: key, lang: "es", body: es });
    }

    const { error } = await supabase.from("ward_sacrament_section_templates").upsert(rows, {
      onConflict: "ward_id,template_key,lang",
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save templates";
    const status = msg.includes("Not authorized") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
