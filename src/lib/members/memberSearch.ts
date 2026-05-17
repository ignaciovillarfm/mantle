export type MemberOption = { id: string; name: string };

export function normalizeMemberSearch(s: string) {
  return s.trim().toLowerCase();
}

export function memberMatchesQuery(name: string, query: string) {
  if (!query) return true;
  return name.toLowerCase().includes(query);
}

export function filterMembersByQuery(members: MemberOption[], query: string): MemberOption[] {
  const q = normalizeMemberSearch(query);
  if (!q) return members;
  return members.filter((m) => memberMatchesQuery(m.name, q));
}
