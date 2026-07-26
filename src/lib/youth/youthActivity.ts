export const YOUTH_QUORUMS = [
  "deacons",
  "teachers",
  "priests",
  "combined",
  "stake",
] as const;

export type YouthQuorum = (typeof YOUTH_QUORUMS)[number];

export type YouthActivity = {
  id: string;
  ward_id: string;
  activity_date: string;
  end_date: string | null;
  title: string;
  quorum: YouthQuorum;
  youth_in_charge: string | null;
  youth_member_id: string | null;
  notes: string | null;
};

export type YouthActivityFormInput = {
  id?: string;
  wardId: string;
  activityDate: string;
  endDate?: string | null;
  title: string;
  quorum: YouthQuorum;
  youthInCharge?: string | null;
  youthMemberId?: string | null;
  notes?: string | null;
};

const QUORUM_LABELS: Record<YouthQuorum, { en: string; es: string; short: string }> = {
  deacons: { en: "Deacons", es: "Diáconos", short: "D" },
  teachers: { en: "Teachers", es: "Maestros", short: "M" },
  priests: { en: "Priests", es: "Presbíteros", short: "P" },
  combined: { en: "Combined", es: "Combinado", short: "C" },
  stake: { en: "Stake", es: "Estaca", short: "S" },
};

export function youthQuorumLabel(quorum: YouthQuorum, lang: "en" | "es" = "en"): string {
  return QUORUM_LABELS[quorum][lang];
}

export function youthQuorumShort(quorum: YouthQuorum): string {
  return QUORUM_LABELS[quorum].short;
}

export function normalizeYouthActivityRow(row: Record<string, unknown>): YouthActivity {
  const quorumRaw = typeof row.quorum === "string" ? row.quorum : "combined";
  const quorum = YOUTH_QUORUMS.includes(quorumRaw as YouthQuorum)
    ? (quorumRaw as YouthQuorum)
    : "combined";

  return {
    id: String(row.id),
    ward_id: String(row.ward_id),
    activity_date: String(row.activity_date).slice(0, 10),
    end_date: typeof row.end_date === "string" ? row.end_date.slice(0, 10) : null,
    title: String(row.title ?? ""),
    quorum,
    youth_in_charge: typeof row.youth_in_charge === "string" ? row.youth_in_charge : null,
    youth_member_id: typeof row.youth_member_id === "string" ? row.youth_member_id : null,
    notes: typeof row.notes === "string" ? row.notes : null,
  };
}

/** Default April–August 2026 schedule for West Park / ward import. */
export const DEFAULT_YOUTH_SCHEDULE_2026: Omit<
  YouthActivityFormInput,
  "id" | "wardId"
>[] = [
  { activityDate: "2026-04-24", endDate: "2026-04-25", title: "Campamento", quorum: "combined" },
  { activityDate: "2026-04-28", title: "Combinado", quorum: "combined" },
  { activityDate: "2026-05-05", title: "Talentos", quorum: "deacons" },
  { activityDate: "2026-05-12", title: "Volleyball", quorum: "priests", youthInCharge: "Adrian" },
  { activityDate: "2026-05-19", title: "Game Night", quorum: "teachers", youthInCharge: "Andy" },
  { activityDate: "2026-05-26", title: "Combinados", quorum: "combined" },
  { activityDate: "2026-06-02", title: "Pasta w/ meatball", quorum: "deacons" },
  { activityDate: "2026-06-09", title: "Repelling", quorum: "teachers", youthInCharge: "Lier-Leo" },
  {
    activityDate: "2026-06-16",
    title: "Temple",
    quorum: "priests",
    youthInCharge: "Sr. Mango / Omer",
  },
  { activityDate: "2026-06-23", title: "Combinados", quorum: "combined" },
  { activityDate: "2026-06-30", title: "Stake", quorum: "stake" },
  {
    activityDate: "2026-07-07",
    title: "Noche de Trivia",
    quorum: "teachers",
    youthInCharge: "Andrew",
    notes: "Assign Andrew",
  },
  { activityDate: "2026-07-14", title: "Dodgeball", quorum: "deacons" },
  { activityDate: "2026-07-21", title: "Carne Asada", quorum: "priests", youthInCharge: "Max" },
  { activityDate: "2026-07-28", title: "Combinado", quorum: "combined" },
  { activityDate: "2026-08-04", title: "Football", quorum: "deacons" },
  { activityDate: "2026-08-11", title: "Escape Room", quorum: "teachers" },
  { activityDate: "2026-08-18", title: "Driver's Ed Prep", quorum: "priests" },
  { activityDate: "2026-08-25", title: "Combinado", quorum: "combined" },
];
