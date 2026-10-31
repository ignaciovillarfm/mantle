import {
  PROGRAM_TEMPLATE_KEYS,
  type ProgramTemplateKey,
} from "@/lib/sacrament/programTemplates";
import { createClient } from "@/lib/supabase/server";

export type ProgramLangBody = { en: string; es: string };
export type ProgramTemplatesMap = Record<ProgramTemplateKey, ProgramLangBody>;

function emptyMap(): ProgramTemplatesMap {
  const map = {} as ProgramTemplatesMap;
  for (const key of PROGRAM_TEMPLATE_KEYS) {
    map[key] = { en: "", es: "" };
  }
  return map;
}

/** Merge global defaults with ward overrides (ward wins). */
export async function loadProgramTemplatesForWard(wardId: string): Promise<{
  defaults: ProgramTemplatesMap;
  templates: ProgramTemplatesMap;
}> {
  const supabase = await createClient();
  const [defaultsRes, overridesRes] = await Promise.all([
    supabase.from("sacrament_section_templates").select("template_key, lang, body"),
    supabase
      .from("ward_sacrament_section_templates")
      .select("template_key, lang, body")
      .eq("ward_id", wardId),
  ]);

  if (defaultsRes.error) throw new Error(defaultsRes.error.message);
  if (overridesRes.error) throw new Error(overridesRes.error.message);

  const defaults = emptyMap();
  for (const row of defaultsRes.data ?? []) {
    const key = row.template_key as string;
    if (!(key in defaults)) continue;
    const lang = row.lang as "en" | "es";
    defaults[key as ProgramTemplateKey][lang] = (row.body as string) ?? "";
  }

  const templates = emptyMap();
  for (const key of PROGRAM_TEMPLATE_KEYS) {
    templates[key] = { ...defaults[key] };
  }
  for (const row of overridesRes.data ?? []) {
    const key = row.template_key as string;
    if (!(key in templates)) continue;
    const lang = row.lang as "en" | "es";
    templates[key as ProgramTemplateKey][lang] = (row.body as string) ?? "";
  }

  return { defaults, templates };
}
