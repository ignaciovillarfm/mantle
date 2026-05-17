export const SACRAMENT_ROLE_KEYS = [
  "presiding",
  "conducting",
  "chorister",
  "organist",
] as const;

export type SacramentRoleKey = (typeof SACRAMENT_ROLE_KEYS)[number];

export type SacramentRolePool = Record<SacramentRoleKey, string[]>;

export const EMPTY_SACRAMENT_ROLE_POOL: SacramentRolePool = {
  presiding: [],
  conducting: [],
  chorister: [],
  organist: [],
};

export function sacramentRoleLabel(
  role: SacramentRoleKey,
  lang: "en" | "es",
): { en: string; es: string } {
  const labels: Record<SacramentRoleKey, { en: string; es: string }> = {
    presiding: { en: "Presides", es: "Preside" },
    conducting: { en: "Conducts", es: "Dirige" },
    chorister: { en: "Music leader / chorister", es: "Corista" },
    organist: { en: "Organist / pianist", es: "Organista / pianista" },
  };
  return labels[role];
}

/** Reorder after removing `startIndex`; `finishIndex` is the insert index in the shortened array. */
export function reorderListItems<T>(list: readonly T[], startIndex: number, finishIndex: number): T[] {
  if (startIndex === finishIndex) return [...list];
  if (startIndex < 0 || startIndex >= list.length) return [...list];
  const result = [...list];
  const [removed] = result.splice(startIndex, 1);
  if (removed === undefined) return [...list];
  const insertAt = Math.max(0, Math.min(finishIndex, result.length));
  result.splice(insertAt, 0, removed);
  return result;
}

export function dedupeMemberIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function normalizeRolePool(pool: SacramentRolePool): SacramentRolePool {
  return {
    presiding: dedupeMemberIds(pool.presiding),
    conducting: dedupeMemberIds(pool.conducting),
    chorister: dedupeMemberIds(pool.chorister),
    organist: dedupeMemberIds(pool.organist),
  };
}

/** Stable JSON for autosave diffing. */
export function serializeRolePool(pool: SacramentRolePool): string {
  return JSON.stringify(normalizeRolePool(pool));
}

export function mergeRoleMemberIds(poolIds: string[], suggestionIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...poolIds, ...suggestionIds]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** First member in the role pool (settings order). */
export function firstPoolMember(poolIds: readonly string[]): string | null {
  return dedupeMemberIds(poolIds)[0] ?? null;
}

/** Dropdown: assigned member first, then only members configured for this role in settings. */
export function roleMemberOptions(
  poolIds: readonly string[],
  currentId: string | null,
  allMembers: { id: string; name: string }[],
): { id: string; name: string }[] {
  const byId = new Map(allMembers.map((m) => [m.id, m]));
  const seen = new Set<string>();
  const result: { id: string; name: string }[] = [];

  if (currentId) {
    const current = byId.get(currentId);
    if (current) {
      result.push(current);
      seen.add(currentId);
    }
  }

  for (const id of dedupeMemberIds(poolIds)) {
    if (seen.has(id)) continue;
    const m = byId.get(id);
    if (m) {
      result.push(m);
      seen.add(id);
    }
  }

  return result;
}
