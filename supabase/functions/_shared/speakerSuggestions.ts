export type MemberInput = {
  id: string;
  name: string;
  last_pulpit_date: string | null;
  is_youth: boolean;
  organization_id: string;
  organization_name: string;
};

export type SpeakerSuggestion = {
  member_id: string;
  name: string;
  days_since_last_talk: number | null;
  organization: string;
};

function daysSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const d = new Date(dateIso + "T00:00:00Z").getTime();
  const diff = Date.now() - d;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Longest time since pulpit first (earliest date); null last_pulpit_date = never (prioritized first). */
export function sortByRotation(members: MemberInput[]): MemberInput[] {
  return [...members].sort((a, b) => {
    if (!a.last_pulpit_date && !b.last_pulpit_date) return a.name.localeCompare(b.name);
    if (!a.last_pulpit_date) return -1;
    if (!b.last_pulpit_date) return 1;
    if (a.last_pulpit_date === b.last_pulpit_date) return a.name.localeCompare(b.name);
    return a.last_pulpit_date < b.last_pulpit_date ? -1 : 1;
  });
}

/**
 * Prefer one youth when available, prefer distinct organizations, then fill remaining slots.
 */
export function buildSpeakerSuggestions(
  members: MemberInput[],
  excludedMemberIds: Set<string>,
  limit = 15,
): SpeakerSuggestion[] {
  const pool = sortByRotation(members.filter((m) => !excludedMemberIds.has(m.id)));
  const pickedIds = new Set<string>();
  const picked: MemberInput[] = [];

  const pushUniqueOrgFirst = (predicate: (m: MemberInput) => boolean) => {
    for (const m of pool) {
      if (picked.length >= limit) return;
      if (pickedIds.has(m.id)) continue;
      if (!predicate(m)) continue;
      if (picked.some((p) => p.organization_id === m.organization_id)) continue;
      picked.push(m);
      pickedIds.add(m.id);
    }
  };

  pushUniqueOrgFirst((m) => m.is_youth);
  pushUniqueOrgFirst(() => true);

  for (const m of pool) {
    if (picked.length >= limit) break;
    if (pickedIds.has(m.id)) continue;
    picked.push(m);
    pickedIds.add(m.id);
  }

  return picked.map((m) => ({
    member_id: m.id,
    name: m.name,
    days_since_last_talk: daysSince(m.last_pulpit_date),
    organization: m.organization_name,
  }));
}
