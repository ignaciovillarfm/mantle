import type { SacramentFormLang } from "@/lib/sacramentProgram";

export type WardBusinessPersonCallingEntry = {
  memberId: string;
  callingPositionId: string;
  /** Explicit companion link. Same calling without this stays as separate lines. */
  linkGroupId?: string;
};

export type CombinedWardBusinessLine = {
  /** Stable key for React lists */
  key: string;
  names: string;
  calling: string;
  memberIds: string[];
  callingPositionId: string;
  linkGroupId: string;
};

function joinNames(names: string[], lang: SacramentFormLang): string {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0]!;
  const conj = lang === "es" ? " y " : " and ";
  if (cleaned.length === 2) return `${cleaned[0]}${conj}${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")}${conj}${cleaned[cleaned.length - 1]}`;
}

/**
 * Build program lines. People are combined only when they share an explicit `linkGroupId`.
 * Sharing a calling alone does not merge them.
 * Calling title is blank when the position id is missing from the catalog.
 */
export function combineWardBusinessEntries(
  entries: WardBusinessPersonCallingEntry[],
  memberNameById: Map<string, string>,
  callingTitleById: Map<string, string>,
  lang: SacramentFormLang = "es",
): CombinedWardBusinessLine[] {
  const buckets = new Map<
    string,
    { memberIds: string[]; callingPositionId: string; linkGroupId: string; order: number }
  >();
  const orderKeys: string[] = [];

  for (const e of entries) {
    const memberId = e.memberId?.trim() ?? "";
    if (!memberId) continue;
    const callingPositionId = e.callingPositionId?.trim() ?? "";
    const linkGroupId = e.linkGroupId?.trim() ?? "";
    // Linked companions share one line; everyone else is an individual line.
    const key = linkGroupId ? `link:${linkGroupId}` : `solo:${memberId}:${callingPositionId}:${orderKeys.length}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        memberIds: [],
        callingPositionId,
        linkGroupId,
        order: orderKeys.length,
      });
      orderKeys.push(key);
    }
    const bucket = buckets.get(key)!;
    if (!bucket.memberIds.includes(memberId)) bucket.memberIds.push(memberId);
    if (!bucket.callingPositionId && callingPositionId) {
      bucket.callingPositionId = callingPositionId;
    }
  }

  return orderKeys.map((key) => {
    const bucket = buckets.get(key)!;
    const names = joinNames(
      bucket.memberIds.map((id) => memberNameById.get(id) ?? ""),
      lang,
    );
    const calling =
      bucket.callingPositionId && callingTitleById.has(bucket.callingPositionId)
        ? (callingTitleById.get(bucket.callingPositionId) ?? "").trim()
        : "";
    return {
      key: `${bucket.linkGroupId || "solo"}::${bucket.memberIds.join(",")}`,
      names,
      calling,
      memberIds: bucket.memberIds,
      callingPositionId: bucket.callingPositionId,
      linkGroupId: bucket.linkGroupId,
    };
  });
}
