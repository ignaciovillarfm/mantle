import type { SupabaseClient } from "@supabase/supabase-js";
import type { SacramentProgramBody } from "@/lib/sacramentProgram";

/**
 * For each sustaining section with linked member + calling preset, ensure a pipeline `callings`
 * row exists (status `To Sustain` → next step Set Apart). Skips duplicates already in the workflow.
 */
export async function syncSustainingCallingsFromProgram(
  supabase: SupabaseClient,
  wardId: string,
  program: SacramentProgramBody,
): Promise<void> {
  const sections = program.wardBusinessSections ?? [];
  const dedupe = new Set<string>();

  for (const sec of sections) {
    if (sec.kind !== "sustainings") continue;
    const entries =
      sec.sustainingEntries && sec.sustainingEntries.length > 0
        ? sec.sustainingEntries
        : sec.sustainingMemberId && sec.sustainingCallingPositionId
          ? [{ memberId: sec.sustainingMemberId, callingPositionId: sec.sustainingCallingPositionId }]
          : [];

    for (const entry of entries) {
      const mid = entry.memberId?.trim();
      const pid = entry.callingPositionId?.trim();
      if (!mid || !pid) continue;

      const key = `${mid}:${pid}`;
      if (dedupe.has(key)) continue;

      const { data: mem, error: memErr } = await supabase
        .from("members")
        .select("ward_id")
        .eq("id", mid)
        .maybeSingle();
      if (memErr || !mem || (mem.ward_id as string) !== wardId) continue;

      const { data: pos, error: posErr } = await supabase
        .from("calling_positions")
        .select("id, title, ward_id")
        .eq("id", pid)
        .maybeSingle();
      if (posErr || !pos || (pos.ward_id as string) !== wardId) continue;

      const { data: existing } = await supabase
        .from("callings")
        .select("id")
        .eq("ward_id", wardId)
        .eq("member_id", mid)
        .eq("calling_position_id", pid)
        .neq("status", "Set Apart")
        .maybeSingle();

      if (existing) {
        dedupe.add(key);
        continue;
      }

      const { error: insErr } = await supabase.from("callings").insert({
        ward_id: wardId,
        member_id: mid,
        calling_position_id: pid,
        name: pos.title as string,
        status: "To Sustain",
      });

      if (!insErr) dedupe.add(key);
    }
  }
}
