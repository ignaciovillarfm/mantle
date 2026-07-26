/** Normalize for duplicate detection (case/space insensitive). */
export function normalizeMemberNameForCompare(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildMemberDisplayName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}
