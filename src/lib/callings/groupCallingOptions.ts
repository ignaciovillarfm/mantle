export type CallingGroupKey =
  | "bishopric_clerical"
  | "relief_society"
  | "elders_quorum"
  | "young_women"
  | "primary"
  | "sunday_school"
  | "aaronic_priesthood"
  | "music"
  | "activities"
  | "mission_temple"
  | "specialists"
  | "youth_programs"
  | "other";

export function isCallingGroupKey(value: string): value is CallingGroupKey {
  return (CALLING_GROUP_ORDER as string[]).includes(value);
}

export const CALLING_GROUP_LABEL: Record<CallingGroupKey, string> = {
  bishopric_clerical: "Bishopric and Clerical",
  relief_society: "Relief Society",
  elders_quorum: "Elders Quorum",
  young_women: "Young Women",
  primary: "Primary",
  sunday_school: "Sunday School",
  aaronic_priesthood: "Aaronic Priesthood",
  music: "Music",
  activities: "Activities",
  mission_temple: "Mission and Temple",
  specialists: "Specialists and Other Roles",
  youth_programs: "Youth Programs",
  other: "Other",
};

export const CALLING_GROUP_ORDER: CallingGroupKey[] = [
  "bishopric_clerical",
  "relief_society",
  "elders_quorum",
  "young_women",
  "primary",
  "sunday_school",
  "aaronic_priesthood",
  "music",
  "activities",
  "mission_temple",
  "specialists",
  "youth_programs",
  "other",
];

export function inferCallingGroup(title: string): CallingGroupKey {
  const t = title.toLowerCase();
  if (t.includes("bishop") || t.includes("clerk") || t.includes("executive secretary")) return "bishopric_clerical";
  if (t.includes("relief society")) return "relief_society";
  if (t.includes("elders quorum")) return "elders_quorum";
  if (t.includes("young women")) return "young_women";
  if (t.includes("primary")) return "primary";
  if (t.includes("sunday school")) return "sunday_school";
  if (t.includes("priests quorum") || t.includes("teachers quorum") || t.includes("deacons quorum"))
    return "aaronic_priesthood";
  if (t.includes("music") || t.includes("choir") || t.includes("pianist") || t.includes("organist")) return "music";
  if (t.includes("activities committee")) return "activities";
  if (t.includes("mission") || t.includes("temple and family history")) return "mission_temple";
  if (t.includes("class presidency") || t.includes("quorum presidency") || t.includes("youth camp"))
    return "youth_programs";
  if (
    t.includes("technology specialist") ||
    t.includes("preparedness") ||
    t.includes("bulletin") ||
    t.includes("communication specialist") ||
    t.includes("single adult") ||
    t.includes("self-reliance") ||
    t.includes("employment specialist") ||
    t.includes("addiction recovery") ||
    t.includes("history specialist") ||
    t.includes("seminary specialist") ||
    t.includes("gardener") ||
    t.includes("outdoor adventure")
  )
    return "specialists";
  return "other";
}

export function groupCallingOptions<T extends { title: string }>(options: T[]) {
  const byGroup = new Map<CallingGroupKey, T[]>();
  for (const option of options) {
    const fromOption = (option as { groupKey?: string }).groupKey;
    const g = fromOption && isCallingGroupKey(fromOption) ? fromOption : inferCallingGroup(option.title);
    const arr = byGroup.get(g) ?? [];
    arr.push(option);
    byGroup.set(g, arr);
  }
  return CALLING_GROUP_ORDER.map((key) => ({
    key,
    label: CALLING_GROUP_LABEL[key],
    options: byGroup.get(key) ?? [],
  })).filter((group) => group.options.length > 0);
}
