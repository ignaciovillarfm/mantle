import {
  CALLING_GROUP_LABEL,
  inferCallingGroup,
  type CallingGroupKey,
} from "@/lib/callings/groupCallingOptions";

/** Keywords that help `inferCallingGroup` classify a custom title into the chosen org/group. */
const GROUP_TITLE_PREFIX: Record<CallingGroupKey, string> = {
  bishopric_clerical: "Bishopric",
  relief_society: "Relief Society",
  elders_quorum: "Elders Quorum",
  young_women: "Young Women",
  primary: "Primary",
  sunday_school: "Sunday School",
  aaronic_priesthood: "Deacons Quorum",
  music: "Music",
  activities: "Activities Committee",
  mission_temple: "Mission",
  specialists: "Technology Specialist",
  youth_programs: "Class Presidency",
  other: "",
};

/**
 * Ensure a new calling title groups under the organization the user picked.
 * If the title already infers that group, return it unchanged.
 */
export function titleForCallingGroup(groupKey: CallingGroupKey, rawTitle: string): string {
  const title = rawTitle.trim().replace(/\s+/g, " ");
  if (!title) return title;
  if (inferCallingGroup(title) === groupKey) return title;
  const prefix = GROUP_TITLE_PREFIX[groupKey];
  if (!prefix) return title;
  if (title.toLowerCase().startsWith(prefix.toLowerCase())) return title;
  return `${prefix} ${title}`;
}

export function callingGroupOptionsForSelect(): { key: CallingGroupKey; label: string }[] {
  return (Object.keys(CALLING_GROUP_LABEL) as CallingGroupKey[]).map((key) => ({
    key,
    label: CALLING_GROUP_LABEL[key],
  }));
}
