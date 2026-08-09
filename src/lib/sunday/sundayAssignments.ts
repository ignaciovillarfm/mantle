import { formatLocalISODate, upcomingSacramentSunday } from "@/lib/sacramentProgram";

export type SundayAssignmentLang = "en" | "es";

/**
 * Sundays to show on the assignment trackers: a little history for context plus
 * the planning window ahead.
 */
export function sundayWindow(
  ref = new Date(),
  weeksBack = 2,
  weeksAhead = 12,
): string[] {
  const firstSunday = upcomingSacramentSunday(ref);
  const start = new Date(
    firstSunday.getFullYear(),
    firstSunday.getMonth(),
    firstSunday.getDate() - weeksBack * 7,
  );

  const sundays: string[] = [];
  for (let i = 0; i <= weeksBack + weeksAhead; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i * 7);
    sundays.push(formatLocalISODate(d));
  }
  return sundays;
}

export function formatSundayLabel(iso: string, lang: SundayAssignmentLang = "es"): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(lang === "es" ? "es" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatSundayMonthHeading(
  iso: string,
  lang: SundayAssignmentLang = "es",
): string {
  const [y, m] = iso.split("-").map(Number);
  if (!y || !m) return iso;
  const label = new Date(y, m - 1, 1).toLocaleDateString(lang === "es" ? "es" : "en-US", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Resolves the display name for an assignment that may point at a member or free text. */
export function assignmentDisplayName(
  memberId: string | null,
  freeText: string | null,
  memberNameById: Map<string, string>,
): string {
  if (memberId) {
    const name = memberNameById.get(memberId)?.trim();
    if (name) return name;
  }
  return freeText?.trim() ?? "";
}
