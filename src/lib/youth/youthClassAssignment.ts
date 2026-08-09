export const YOUTH_CLASSES = [
  "combined",
  "deacons",
  "teachers",
  "priests",
  "young_women",
] as const;

export type YouthClass = (typeof YOUTH_CLASSES)[number];

export type YouthClassAssignment = {
  id: string;
  ward_id: string;
  sunday_date: string;
  quorum: YouthClass;
  member_id: string | null;
  teacher_name: string | null;
  topic: string | null;
  notes: string | null;
};

export type YouthClassAssignmentInput = {
  id?: string;
  wardId: string;
  sundayDate: string;
  quorum: YouthClass;
  memberId: string | null;
  teacherName: string | null;
  topic: string | null;
  notes: string | null;
};

const CLASS_LABELS: Record<YouthClass, { en: string; es: string }> = {
  combined: { en: "Combined", es: "Combinada" },
  deacons: { en: "Deacons", es: "Diáconos" },
  teachers: { en: "Teachers", es: "Maestros" },
  priests: { en: "Priests", es: "Presbíteros" },
  young_women: { en: "Young Women", es: "Mujeres Jóvenes" },
};

export function youthClassLabel(cls: YouthClass, lang: "en" | "es" = "en"): string {
  return CLASS_LABELS[cls][lang];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

export function parseYouthClass(v: unknown): YouthClass {
  const s = typeof v === "string" ? v.trim() : "";
  return YOUTH_CLASSES.includes(s as YouthClass) ? (s as YouthClass) : "combined";
}

export function normalizeYouthClassAssignmentRow(
  row: Record<string, unknown>,
): YouthClassAssignment {
  return {
    id: String(row.id ?? ""),
    ward_id: String(row.ward_id ?? ""),
    sunday_date: String(row.sunday_date ?? "").slice(0, 10),
    quorum: parseYouthClass(row.quorum),
    member_id: str(row.member_id),
    teacher_name: str(row.teacher_name),
    topic: str(row.topic),
    notes: str(row.notes),
  };
}

export function isYouthClassAssignmentFilled(
  assignment: Pick<YouthClassAssignment, "member_id" | "teacher_name"> | undefined,
): boolean {
  if (!assignment) return false;
  return Boolean(assignment.member_id || assignment.teacher_name);
}
