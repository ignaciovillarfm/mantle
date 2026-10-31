/** Normalize calling titles for comparison. */
export function normalizeCallingTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Common Church report titles (EN/ES) → Mantle `calling_positions.title`. */
const CALLING_TITLE_ALIASES: Record<string, string> = {
  "bishopric first counselor": "first counselor in the bishopric",
  "bishopric second counselor": "second counselor in the bishopric",
  "primary first counselor": "first counselor in the primary presidency",
  "primary second counselor": "second counselor in the primary presidency",
  "relief society first counselor": "first counselor in the relief society presidency",
  "relief society second counselor": "second counselor in the relief society presidency",
  "elders quorum first counselor": "first counselor in the elders quorum presidency",
  "elders quorum second counselor": "second counselor in the elders quorum presidency",
  "sunday school first counselor": "first counselor in the sunday school presidency",
  "sunday school second counselor": "second counselor in the sunday school presidency",
  "young women first counselor": "first counselor in the young women presidency",
  "young women second counselor": "second counselor in the young women presidency",
  "young men first counselor": "first counselor in the young men presidency",
  "young men second counselor": "second counselor in the young men presidency",
  "ward temple and family history leader": "temple and family history leader",
  "technology specialist": "ward technology specialist",
  "young women class adviser": "young women adviser",
  "relief society ministering secretary": "relief society secretary",
  "welfare and self reliance specialist": "self-reliance specialist",
  "welfare and self-reliance specialist": "self-reliance specialist",
  // Nursery Leader is its own role — do not alias to Primary Teacher
  "especialista del boletin de barrio": "ward bulletin specialist",
  "especialista de tecnologia del barrio": "ward technology specialist",
  "acompanante": "choir accompanist",
  "accompanist": "choir accompanist",
  "builders of faith class president": "young women class president",
  "builders of faith class counselor": "young women class counselor",
  "builders of faith class second counselor": "young women class counselor",
  "builders of faith class first counselor": "young women class counselor",
  "builders of faith class secretary": "young women class secretary",
  "gatherers of light class president": "young women class president",
  "gatherers of light class first counselor": "young women class counselor",
  "gatherers of light class second counselor": "young women class counselor",
  "gatherers of light class secretary": "young women class secretary",
  "maestra 2do domingo": "relief society teacher",
  "lider misional de barrio": "ward mission leader",
  "lider de actividades del barrio": "activities committee chair",
  "miembro de comite de actividades": "activities committee member",
  "coordinador de campamento": "youth camp leader",
  "lider de campamento": "youth camp leader",
  "music leader": "ward music director",
};

/** Org family tokens — mismatched families are heavily penalized. */
const ORG_FAMILIES: string[][] = [
  ["bishopric", "bishop", "ward clerk", "assistant ward clerk", "executive secretary"],
  ["elders quorum"],
  ["relief society"],
  ["primary", "nursery"],
  ["sunday school"],
  ["young women"],
  ["young men", "deacons quorum", "teachers quorum", "priests quorum"],
  ["ward mission", "temple and family", "family history"],
  ["music", "choir", "pianist", "organist", "accompanist"],
];

function orgFamilyId(norm: string): number | null {
  for (let i = 0; i < ORG_FAMILIES.length; i++) {
    if (ORG_FAMILIES[i].some((t) => norm.includes(t))) return i;
  }
  return null;
}

function tokens(s: string): Set<string> {
  return new Set(normalizeCallingTitle(s).split(" ").filter((t) => t.length > 1));
}

/** Dice coefficient on word tokens (0..1), with alias + org-family handling. */
export function callingTitleSimilarity(a: string, b: string): number {
  const na = normalizeCallingTitle(a);
  const nb = normalizeCallingTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const aliasA = CALLING_TITLE_ALIASES[na] ?? na;
  const aliasB = CALLING_TITLE_ALIASES[nb] ?? nb;
  if (aliasA === aliasB || aliasA === nb || na === aliasB) return 1;

  const ta = tokens(aliasA);
  const tb = tokens(aliasB);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  let score = (2 * inter) / (ta.size + tb.size);

  const fa = orgFamilyId(aliasA);
  const fb = orgFamilyId(aliasB);
  if (fa != null && fb != null && fa !== fb) {
    score *= 0.35;
  }

  // Distinct offices that share words (Coordinator / Quorum) must not auto-match
  const rolePairs: [string, string][] = [
    ["activity", "ministering"],
    ["service", "ministering"],
    ["president", "adviser"],
    ["president", "counselor"],
  ];
  for (const [x, y] of rolePairs) {
    const aHas = ta.has(x) || aliasA.includes(x);
    const bHas = tb.has(y) || aliasB.includes(y);
    const aHasY = ta.has(y) || aliasA.includes(y);
    const bHasX = tb.has(x) || aliasB.includes(x);
    if ((aHas && bHas && !aHasY && !bHasX) || (aHasY && bHasX && !aHas && !bHas)) {
      score *= 0.4;
    }
  }

  return score;
}

export type PositionMatch = {
  id: string;
  title: string;
  score: number;
  kind: "exact" | "closest";
};

/** Best catalog title for a report calling (any score). Used for Review explanations. */
export function findClosestCallingPosition(
  rawTitle: string,
  positions: { id: string; title: string }[],
): PositionMatch | null {
  if (!rawTitle.trim() || positions.length === 0) return null;
  let best: PositionMatch | null = null;
  for (const p of positions) {
    const score = callingTitleSimilarity(rawTitle, p.title);
    if (!best || score > best.score) {
      best = {
        id: p.id,
        title: p.title,
        score,
        kind: score >= 0.92 ? "exact" : "closest",
      };
    }
  }
  return best && best.score > 0 ? best : null;
}

/** Confident catalog match for auto insert/keep (score ≥ 0.55). */
export function matchCallingPosition(
  rawTitle: string,
  positions: { id: string; title: string }[],
): PositionMatch | null {
  const best = findClosestCallingPosition(rawTitle, positions);
  // Avoid weak overlaps like “Disability Specialist” → “Communication Specialist”
  if (!best || best.score < 0.55) return null;
  if (best.score >= 0.92) best.kind = "exact";
  return best;
}
