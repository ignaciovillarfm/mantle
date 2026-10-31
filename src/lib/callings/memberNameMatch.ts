/** Normalize person names for matching Church report → Mantle members. */
export function normalizePersonName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameTokens(name: string): string[] {
  return normalizePersonName(name).split(" ").filter(Boolean);
}

/** Dice on name tokens. */
export function personNameSimilarity(a: string, b: string): number {
  const ta = new Set(nameTokens(a));
  const tb = new Set(nameTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  return (2 * inter) / (ta.size + tb.size);
}

/**
 * Church “Members with Callings” uses "Last, First Middle".
 * Mantle uses "First Last". Score comma-flip, reverse, and token overlap.
 */
export function memberNameScore(reportName: string, memberFullName: string): number {
  const report = normalizePersonName(reportName);
  const member = normalizePersonName(memberFullName);
  if (!report || !member) return 0;
  if (report === member) return 1;

  // "Acosta Galindo, Ana Berleny" → "Ana Berleny Acosta Galindo"
  const commaFlip = reportName.includes(",")
    ? normalizePersonName(
        reportName
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
          .reverse()
          .join(" "),
      )
    : "";
  if (commaFlip && commaFlip === member) return 1;

  const reportTokens = nameTokens(reportName);
  const memberTokens = nameTokens(memberFullName);
  if (reportTokens.length === 0 || memberTokens.length === 0) return 0;

  const reversed = [...reportTokens].reverse().join(" ");
  if (reversed === member) return 1;

  const lastFirst = `${reportTokens.slice(1).join(" ")} ${reportTokens[0]}`.trim();
  if (normalizePersonName(lastFirst) === member) return 0.98;

  const candidates = [reportName, reversed, lastFirst, commaFlip].filter(Boolean);
  let best = 0;
  for (const c of candidates) {
    best = Math.max(best, personNameSimilarity(c, memberFullName));
  }

  // Prefer matches that share a last-name token (before comma, or last Mantle token)
  const reportLast = reportName.includes(",")
    ? nameTokens(reportName.split(",")[0] ?? "")[0]
    : reportTokens[0];
  const memberLast = memberTokens[memberTokens.length - 1];
  const lastBonus =
    reportLast && memberLast && reportLast === memberLast ? 0.08 : 0;

  // "Chavez, Alhi" ⊂ "Alvin Alhi Chavez" — all report tokens present in member
  const flipTokens = commaFlip ? nameTokens(commaFlip) : reportTokens;
  const memberSet = new Set(memberTokens);
  if (
    flipTokens.length >= 2 &&
    flipTokens.every((t) => memberSet.has(t)) &&
    reportLast &&
    memberLast &&
    reportLast === memberLast
  ) {
    return 0.96;
  }

  return Math.min(1, best + lastBonus);
}

export type MemberMatch = {
  id: string;
  full_name: string;
  score: number;
  kind: "exact" | "closest";
};

/** Best Mantle member for a report name (any score). Used for Review explanations. */
export function findClosestMember(
  reportName: string,
  members: { id: string; full_name: string }[],
): MemberMatch | null {
  let best: MemberMatch | null = null;
  for (const m of members) {
    const score = memberNameScore(reportName, m.full_name);
    if (!best || score > best.score) {
      best = {
        id: m.id,
        full_name: m.full_name,
        score,
        kind: score >= 0.9 ? "exact" : "closest",
      };
    }
  }
  return best && best.score > 0 ? best : null;
}

/** Confident member match for auto insert/keep (score ≥ 0.55). */
export function matchMember(
  reportName: string,
  members: { id: string; full_name: string }[],
): MemberMatch | null {
  const best = findClosestMember(reportName, members);
  if (!best || best.score < 0.55) return null;
  if (best.score >= 0.9) best.kind = "exact";
  return best;
}
