import {
  formatLocalISODate,
  parseLocalDateFromISO,
  shiftCalendarWeek,
  startOfWeekSundayFromISO,
} from "@/lib/sacramentProgram";

export const WARD_ACTIVITY_CATEGORIES = [
  "activity",
  "meeting",
  "service",
  "youth",
  "temple",
  "missionary",
  "other",
] as const;

export type WardActivityCategory = (typeof WARD_ACTIVITY_CATEGORIES)[number];

export const ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS = [1, 2, 3] as const;
export type AnnouncementWeeksBefore = (typeof ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS)[number];

export type WardCalendarActivity = {
  id: string;
  ward_id: string;
  activity_date: string;
  title: string;
  notes: string | null;
  location: string | null;
  start_time: string | null;
  end_time: string | null;
  category: WardActivityCategory;
  organizer_member_id: string | null;
  include_in_sacrament_program: boolean;
  announcement_weeks_before: AnnouncementWeeksBefore;
  announcement_text: string | null;
  last_synced_announcement_text: string | null;
  last_synced_sacrament_weeks: string[];
};

export type WardActivityFormInput = {
  id?: string;
  wardId: string;
  activityDate: string;
  title: string;
  notes?: string | null;
  location?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  category?: WardActivityCategory;
  organizerMemberId?: string | null;
  includeInSacramentProgram?: boolean;
  announcementWeeksBefore?: AnnouncementWeeksBefore;
  announcementText?: string | null;
};

const CATEGORY_LABELS: Record<WardActivityCategory, { en: string; es: string }> = {
  activity: { en: "Ward activity", es: "Actividad del barrio" },
  meeting: { en: "Meeting", es: "Reunión" },
  service: { en: "Service project", es: "Proyecto de servicio" },
  youth: { en: "Youth", es: "Juveniles" },
  temple: { en: "Temple", es: "Templo" },
  missionary: { en: "Missionary", es: "Misionero" },
  other: { en: "Other", es: "Otro" },
};

export function wardActivityCategoryLabel(
  category: WardActivityCategory,
  lang: "en" | "es" = "es",
): string {
  return CATEGORY_LABELS[category][lang];
}

/** YYYY-MM from a date or month anchor. */
export function formatMonthYear(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseMonthYear(month: string): { year: number; monthIndex: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

export function shiftMonth(month: string, delta: number): string {
  const parsed = parseMonthYear(month);
  if (!parsed) return month;
  const d = new Date(parsed.year, parsed.monthIndex + delta, 1);
  return formatMonthYear(d);
}

export function monthDateRange(month: string): { start: string; end: string } | null {
  const parsed = parseMonthYear(month);
  if (!parsed) return null;
  const start = formatLocalISODate(new Date(parsed.year, parsed.monthIndex, 1));
  const end = formatLocalISODate(new Date(parsed.year, parsed.monthIndex + 1, 0));
  return { start, end };
}

/** Sunday-start grid cells for a month (null = empty padding). */
export function buildMonthGrid(month: string): (string | null)[] {
  const parsed = parseMonthYear(month);
  if (!parsed) return [];
  const { year, monthIndex } = parsed;
  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (string | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= lastDay; day++) {
    cells.push(formatLocalISODate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatMonthLabel(month: string, lang: "en" | "es" = "es"): string {
  const parsed = parseMonthYear(month);
  if (!parsed) return month;
  const d = new Date(parsed.year, parsed.monthIndex, 1);
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
}

export function formatActivityDateShort(iso: string, lang: "en" | "es" = "es"): string {
  const d = parseLocalDateFromISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function formatTimeShort(time: string, lang: "en" | "es"): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const d = new Date(2000, 0, 1, h, m);
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
}

export function sacramentWeekForActivityDate(activityDate: string): string {
  return formatLocalISODate(startOfWeekSundayFromISO(activityDate));
}

/** Sacrament Sundays to announce on, starting N weeks before the activity week. */
export function sacramentAnnouncementWeeks(
  activityDate: string,
  weeksBefore: AnnouncementWeeksBefore,
): string[] {
  const activityWeek = sacramentWeekForActivityDate(activityDate);
  const weeks: string[] = [];
  for (let i = weeksBefore; i >= 1; i--) {
    weeks.push(shiftCalendarWeek(activityWeek, -i));
  }
  return weeks;
}

export function announcementWeeksBeforeLabel(
  weeks: AnnouncementWeeksBefore,
  lang: "en" | "es" = "es",
): string {
  if (lang === "es") {
    if (weeks === 1) return "1 semana de anticipación";
    return `${weeks} semanas de anticipación`;
  }
  if (weeks === 1) return "1 week in advance";
  return `${weeks} weeks in advance`;
}

export function formatSacramentWeekShort(iso: string, lang: "en" | "es" = "es"): string {
  const d = parseLocalDateFromISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(d);
}

function parseAnnouncementWeeksBefore(v: unknown): AnnouncementWeeksBefore {
  const n = typeof v === "number" ? v : Number(v);
  if (n === 2 || n === 3) return n;
  return 1;
}

function parseSyncedWeeks(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x));
}

/** Default announcement line for sacrament program from activity fields. */
export function buildDefaultAnnouncementText(
  input: {
    title: string;
    activityDate: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    notes?: string | null;
  },
  lang: "en" | "es" = "es",
): string {
  const parts: string[] = [input.title.trim()];
  const dateLabel = formatActivityDateShort(input.activityDate, lang);
  parts.push(dateLabel);

  if (input.startTime?.trim()) {
    const timePart = input.endTime?.trim()
      ? `${formatTimeShort(input.startTime, lang)}–${formatTimeShort(input.endTime, lang)}`
      : formatTimeShort(input.startTime, lang);
    parts.push(timePart);
  }

  if (input.location?.trim()) {
    parts.push(input.location.trim());
  }

  let line = parts.join(" · ");
  const noteSnippet = input.notes?.trim();
  if (noteSnippet) {
    const short =
      noteSnippet.length > 120 ? `${noteSnippet.slice(0, 117).trim()}…` : noteSnippet;
    line = `${line}. ${short}`;
  }
  return line;
}

export function normalizeActivityRow(row: Record<string, unknown>): WardCalendarActivity {
  const categoryRaw = typeof row.category === "string" ? row.category : "activity";
  const category = WARD_ACTIVITY_CATEGORIES.includes(categoryRaw as WardActivityCategory)
    ? (categoryRaw as WardActivityCategory)
    : "activity";

  return {
    id: String(row.id),
    ward_id: String(row.ward_id),
    activity_date: String(row.activity_date).slice(0, 10),
    title: String(row.title ?? ""),
    notes: typeof row.notes === "string" ? row.notes : null,
    location: typeof row.location === "string" ? row.location : null,
    start_time: typeof row.start_time === "string" ? row.start_time.slice(0, 5) : null,
    end_time: typeof row.end_time === "string" ? row.end_time.slice(0, 5) : null,
    category,
    organizer_member_id:
      typeof row.organizer_member_id === "string" ? row.organizer_member_id : null,
    include_in_sacrament_program: row.include_in_sacrament_program === true,
    announcement_weeks_before: parseAnnouncementWeeksBefore(row.announcement_weeks_before),
    announcement_text: typeof row.announcement_text === "string" ? row.announcement_text : null,
    last_synced_announcement_text:
      typeof row.last_synced_announcement_text === "string"
        ? row.last_synced_announcement_text
        : null,
    last_synced_sacrament_weeks: parseSyncedWeeks(row.last_synced_sacrament_weeks),
  };
}
