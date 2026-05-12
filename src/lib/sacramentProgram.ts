/** JSON stored in `sacrament_meetings.program` (plus `theme` column for “En preparación para…”). */

export const WARD_BUSINESS_SECTION_KINDS = [
  "releases",
  "sustainings",
  "aaron_priesthood_ordination",
  "new_members",
  "other",
] as const;

export type WardBusinessSectionKind = (typeof WARD_BUSINESS_SECTION_KINDS)[number];

export type WardBusinessSection = {
  id: string;
  kind: WardBusinessSectionKind;
  /** Optional heading; when empty, UI uses `wardBusinessSectionDefaultTitle`. */
  title: string;
  body: string;
  /**
   * When `kind === "sustainings"`: member + catalog position for pipeline sync (proposed callings).
   * Stored in saved program JSON; omitted for legacy rows.
   */
  sustainingMemberId?: string;
  sustainingCallingPositionId?: string;
  /** Multi-person sustainings support (preferred over single legacy fields above). */
  sustainingEntries?: { memberId: string; callingPositionId: string }[];
  /** Multi-person releases support; rendered separately in UI. */
  releaseEntries?: { memberId: string; callingPositionId: string }[];
  /** Multi-person ordinations support; rendered separately in UI. */
  ordinationEntries?: { memberId: string; office: AaronicOffice }[];
  /** Text template key resolved at render-time from DB templates table. */
  templateKey?: string;
  /** For `new_members`, holds the inserted family/names text. */
  newMembersNames?: string;
};

/** Max number of ward-business subsections (Relevos, Sostenimientos, etc.). */
export const MAX_WARD_BUSINESS_SECTIONS = 16;

/** Max rows in the Relevos table inside the add-section modal. */
export const MAX_WARD_BUSINESS_RELEASE_ROWS = 24;

export type SacramentFormLang = "en" | "es";

export type SacramentProgramBody = {
  greetingNote: string;
  recognitionNote: string;
  announcements: string;
  openingHymn: string;
  sacramentHymn: string;
  closingHymn: string;
  /** @deprecated Legacy free-text; cleared when using `wardBusinessSections`. Kept for JSON compatibility. */
  wardBusiness: string;
  /** Name of the person representing the stake (short line, after ward business). */
  stakeBusiness: string;
  /** @deprecated Legacy; migrated into `wardBusinessSections` on parse. */
  releases: string;
  /** @deprecated Legacy; migrated into `wardBusinessSections` on parse. */
  sustainings: string;
  wardBusinessSections: WardBusinessSection[];
  preparationTheme: string;
  reverenceNote: string;
  priesthoodInstruction: string;
};

export const DEFAULT_SACRAMENT_PROGRAM: SacramentProgramBody = {
  greetingNote: "",
  recognitionNote: "",
  announcements: "",
  openingHymn: "",
  sacramentHymn: "",
  closingHymn: "",
  wardBusiness: "",
  stakeBusiness: "",
  releases: "",
  sustainings: "",
  wardBusinessSections: [],
  preparationTheme: "",
  reverenceNote:
    "Les agradecemos por su reverencia durante la administración de la Santa Cena.",
  priesthoodInstruction:
    "Pedimos al sacerdocio que se sienten con sus familias después de pasar el sacramento.",
};

const WARD_KIND_SET = new Set<string>(WARD_BUSINESS_SECTION_KINDS);

function newWardSectionId(): string {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `wb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function parseWardBusinessSectionKind(raw: unknown): WardBusinessSectionKind {
  return typeof raw === "string" && WARD_KIND_SET.has(raw) ? (raw as WardBusinessSectionKind) : "other";
}

export function wardBusinessSectionDefaultTitle(
  kind: WardBusinessSectionKind,
  lang: SacramentFormLang,
): string {
  const labels: Record<WardBusinessSectionKind, { en: string; es: string }> = {
    releases: { en: "Releases", es: "Relevos" },
    sustainings: { en: "Sustainings", es: "Sostenimientos" },
    aaron_priesthood_ordination: {
      en: "Aaronic Priesthood ordination",
      es: "Ordenación Sacerdocio Aarónico",
    },
    new_members: {
      en: "New ward members (current names)",
      es: "Nombres actuales de nuevos miembros de barrio",
    },
    other: {
      en: "Other (baby blessings / confirmations)",
      es: "Otros (bendiciones de bebé / confirmaciones)",
    },
  };
  return lang === "es" ? labels[kind].es : labels[kind].en;
}

/**
 * Default wording when **adding** a ward-business section (editable afterward).
 * Spanish matches the ward’s phrasing; English is a structural draft until finalized.
 */
export function defaultWardBusinessSectionBody(kind: WardBusinessSectionKind, lang: SacramentFormLang): string {
  if (lang === "es") {
    switch (kind) {
      case "releases":
        return "";
      case "sustainings":
        return "";
      case "aaron_priesthood_ordination":
        return "";
      case "new_members":
        return "";
      case "other":
        return "(Detalles: bendición de bebé, confirmación u otro.)";
      default:
        return "";
    }
  }

  switch (kind) {
    case "releases":
      return "";
    case "sustainings":
      return "";
    case "aaron_priesthood_ordination":
      return "";
    case "new_members":
      return "";
    case "other":
      return "(Details: baby blessing, confirmation, or other.)";
    default:
      return "";
  }
}

export function wardBusinessSectionHeading(section: WardBusinessSection, lang: SacramentFormLang): string {
  const t = section.title.trim();
  if (t) return t;
  return wardBusinessSectionDefaultTitle(section.kind, lang);
}

/**
 * Canonical display order for "Asuntos del barrio".
 */
export function wardBusinessSectionDisplayOrder(section: WardBusinessSection): number {
  if (section.kind === "releases") return 10;
  if (section.kind === "sustainings") return 20;
  if (section.kind === "aaron_priesthood_ordination") return 30;
  if (section.kind === "new_members") return 40;
  if (section.kind === "other") return 50;
  return 999;
}

export function defaultTemplateKeyForWardKind(kind: WardBusinessSectionKind): string | null {
  if (kind === "releases") return "ward.releases.default";
  if (kind === "sustainings") return "ward.sustainings.default";
  if (kind === "new_members") return "ward.new_members.default";
  return null;
}

export type WardBusinessReleaseRow = {
  id: string;
  /** Ward directory member; resolved to `name` when building program text. */
  member_id: string | null;
  /** `calling_positions.id`; title resolved when building program text. */
  calling_position_id: string | null;
};

export type AaronicOffice = "deacon" | "teacher" | "priest" | "";

export type WardBusinessOrdinationRow = {
  id: string;
  member_id: string | null;
  office: AaronicOffice;
};

/** Values collected in the “add ward business section” modal before building `body`. */
export type WardBusinessModalFields = {
  /** Sostenimientos / ordenación: ward member for scripted name line. */
  personMemberId: string | null;
  /** Sostenimientos: `calling_positions.id` for [Cargo] line. */
  callingPositionId: string | null;
  aaronicOffice: AaronicOffice;
  familyName: string;
  familyMembers: string;
  /** Relevos: one row per person (nombre + cargo). */
  releaseRows: WardBusinessReleaseRow[];
  /** Sostenimientos: one row per person (nombre + cargo). */
  sustainingRows: WardBusinessReleaseRow[];
  /** Ordenación: one row per person (nombre + oficio). */
  ordinationRows: WardBusinessOrdinationRow[];
  otherDetails: string;
};

export function newWardBusinessReleaseRow(): WardBusinessReleaseRow {
  return { id: newWardSectionId(), member_id: null, calling_position_id: null };
}

export function newWardBusinessOrdinationRow(): WardBusinessOrdinationRow {
  return { id: newWardSectionId(), member_id: null, office: "" };
}

export function initialWardBusinessModalFields(): WardBusinessModalFields {
  return {
    personMemberId: null,
    callingPositionId: null,
    aaronicOffice: "",
    familyName: "",
    familyMembers: "",
    releaseRows: [newWardBusinessReleaseRow()],
    sustainingRows: [newWardBusinessReleaseRow()],
    ordinationRows: [newWardBusinessOrdinationRow()],
    otherDetails: "",
  };
}

/** @deprecated Use `initialWardBusinessModalFields()`. */
export const EMPTY_WARD_BUSINESS_MODAL_FIELDS: WardBusinessModalFields = initialWardBusinessModalFields();

/** Build `title` + `body` for a new section from modal fields (uses `defaultWardBusinessSectionBody` templates). */
export function buildWardBusinessSectionFromModal(
  kind: WardBusinessSectionKind,
  lang: SacramentFormLang,
  fields: WardBusinessModalFields,
  _members: { id: string; name: string }[] = [],
  _callingPositions: { id: string; title: string }[] = [],
): { title: string; body: string } {
  void _members;
  void _callingPositions;
  const title = "";

  if (kind === "other") {
    const d = fields.otherDetails.trim();
    return {
      title,
      body: d || defaultWardBusinessSectionBody("other", lang),
    };
  }

  if (kind === "releases") {
    return { title, body: "" };
  }

  if (kind === "new_members") {
    const family = fields.familyName.trim();
    const members = fields.familyMembers.trim();
    const f = family && members ? `${family}, ${members}` : family || members;
    return { title, body: f };
  }

  if (kind === "sustainings") {
    return { title, body: "" };
  }

  const template = defaultWardBusinessSectionBody("aaron_priesthood_ordination", lang);
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "ordination-text-debug-1",
      hypothesisId: "H1",
      location: "sacramentProgram.ts:buildWardBusinessSectionFromModal:ordination",
      message: "Built ordination section body from modal",
      data: {
        lang,
        ordinationRows: fields.ordinationRows.map((r) => ({ member_id: r.member_id, office: r.office })),
        bodyPreview:
          lang === "es"
            ? template.replace(
                "[FraseOrdenacion]",
                "Se propone que [Nombre completo] reciba el Sacerdocio Aarónico y sea ordenado al oficio de [oficio], o que sea avanzado al oficio de [oficio] en el Sacerdocio Aarónico",
              )
            : template,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (lang === "es") {
    return { title, body: "" };
  }
  return {
    title,
    body: "",
  };
}

function parseWardBusinessSectionsArray(raw: unknown): WardBusinessSection[] {
  if (!Array.isArray(raw)) return [];
  const out: WardBusinessSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = parseWardBusinessSectionKind(row.kind);
    const id = typeof row.id === "string" && row.id.length > 0 ? row.id : newWardSectionId();
    const title = typeof row.title === "string" ? row.title : "";
    const body = typeof row.body === "string" ? row.body : "";
    const sustainingMemberId =
      typeof row.sustainingMemberId === "string" && row.sustainingMemberId.trim().length > 0
        ? row.sustainingMemberId.trim()
        : undefined;
    const sustainingCallingPositionId =
      typeof row.sustainingCallingPositionId === "string" &&
      row.sustainingCallingPositionId.trim().length > 0
        ? row.sustainingCallingPositionId.trim()
        : undefined;
    const section: WardBusinessSection = { id, kind, title, body };
    if (typeof row.templateKey === "string" && row.templateKey.trim().length > 0) {
      section.templateKey = row.templateKey.trim();
    }
    if (typeof row.newMembersNames === "string" && row.newMembersNames.trim().length > 0) {
      section.newMembersNames = row.newMembersNames.trim();
    }
    const releaseEntries = Array.isArray(row.releaseEntries)
      ? row.releaseEntries
          .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
          .map((e) => ({
            memberId:
              typeof e.memberId === "string" && e.memberId.trim().length > 0 ? e.memberId.trim() : "",
            callingPositionId:
              typeof e.callingPositionId === "string" && e.callingPositionId.trim().length > 0
                ? e.callingPositionId.trim()
                : "",
          }))
          .filter((e) => e.memberId && e.callingPositionId)
      : [];
    if (releaseEntries.length > 0) {
      section.releaseEntries = releaseEntries;
    }
    const ordinationEntries = Array.isArray(row.ordinationEntries)
      ? row.ordinationEntries
          .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
          .map((e): { memberId: string; office: AaronicOffice } => ({
            memberId:
              typeof e.memberId === "string" && e.memberId.trim().length > 0 ? e.memberId.trim() : "",
            office:
              e.office === "deacon" || e.office === "teacher" || e.office === "priest" ? e.office : "",
          }))
          .filter((e) => e.memberId && e.office)
      : [];
    if (ordinationEntries.length > 0) {
      section.ordinationEntries = ordinationEntries;
    }
    const sustainingEntries = Array.isArray(row.sustainingEntries)
      ? row.sustainingEntries
          .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
          .map((e) => ({
            memberId:
              typeof e.memberId === "string" && e.memberId.trim().length > 0
                ? e.memberId.trim()
                : "",
            callingPositionId:
              typeof e.callingPositionId === "string" && e.callingPositionId.trim().length > 0
                ? e.callingPositionId.trim()
                : "",
          }))
          .filter((e) => e.memberId && e.callingPositionId)
      : [];
    if (sustainingEntries.length > 0) {
      section.sustainingEntries = sustainingEntries;
    }
    if (sustainingMemberId && sustainingCallingPositionId) {
      section.sustainingMemberId = sustainingMemberId;
      section.sustainingCallingPositionId = sustainingCallingPositionId;
    }
    out.push(section);
    if (out.length >= MAX_WARD_BUSINESS_SECTIONS) break;
  }
  return out;
}

function migrateLegacyWardBusinessToSections(
  releases: string,
  sustainings: string,
  wardBusiness: string,
): WardBusinessSection[] {
  const out: WardBusinessSection[] = [];
  if (releases.trim()) {
    out.push({ id: newWardSectionId(), kind: "releases", title: "", body: releases.trim() });
  }
  if (sustainings.trim()) {
    out.push({ id: newWardSectionId(), kind: "sustainings", title: "", body: sustainings.trim() });
  }
  if (wardBusiness.trim()) {
    out.push({ id: newWardSectionId(), kind: "other", title: "", body: wardBusiness.trim() });
  }
  return out;
}

export function parseSacramentProgram(raw: unknown): SacramentProgramBody {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SACRAMENT_PROGRAM };
  const o = raw as Record<string, unknown>;
  const str = (k: Exclude<keyof SacramentProgramBody, "wardBusinessSections">) =>
    typeof o[k] === "string" ? (o[k] as string) : DEFAULT_SACRAMENT_PROGRAM[k];

  const legacyReleases = str("releases");
  const legacySustainings = str("sustainings");
  const legacyWardBusiness = str("wardBusiness");
  const rawSections = o.wardBusinessSections;

  let wardBusinessSections: WardBusinessSection[];
  if (Array.isArray(rawSections) && rawSections.length > 0) {
    wardBusinessSections = parseWardBusinessSectionsArray(rawSections);
  } else if (Array.isArray(rawSections) && rawSections.length === 0) {
    wardBusinessSections = [];
  } else {
    wardBusinessSections = migrateLegacyWardBusinessToSections(legacyReleases, legacySustainings, legacyWardBusiness);
  }

  return {
    greetingNote: str("greetingNote"),
    recognitionNote: str("recognitionNote"),
    announcements: str("announcements"),
    openingHymn: str("openingHymn"),
    sacramentHymn: str("sacramentHymn"),
    closingHymn: str("closingHymn"),
    wardBusiness: "",
    stakeBusiness: str("stakeBusiness"),
    releases: "",
    sustainings: "",
    wardBusinessSections,
    preparationTheme: str("preparationTheme"),
    reverenceNote: str("reverenceNote") || DEFAULT_SACRAMENT_PROGRAM.reverenceNote,
    priesthoodInstruction:
      str("priesthoodInstruction") || DEFAULT_SACRAMENT_PROGRAM.priesthoodInstruction,
  };
}

export function mergeProgramFromPrevious(
  previous: SacramentProgramBody | null,
): SacramentProgramBody {
  if (!previous) return { ...DEFAULT_SACRAMENT_PROGRAM };
  return parseSacramentProgram({ ...DEFAULT_SACRAMENT_PROGRAM, ...previous });
}

/** Local calendar date as YYYY-MM-DD */
export function formatLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Next sacrament Sunday from ref (if ref is Sunday, returns that same day). */
export function upcomingSacramentSunday(ref = new Date()): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const dow = d.getDay();
  if (dow === 0) return d;
  d.setDate(d.getDate() + (7 - dow));
  return d;
}

/** Parse `YYYY-MM-DD` as a local calendar date (no UTC shift). */
export function parseLocalDateFromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

/** Sunday-start week containing the given local date. */
export function startOfWeekSundayFromISO(iso: string): Date {
  const d = parseLocalDateFromISO(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Long formatted Sunday label for the sacrament week strip. */
export function sacramentSundayLongLabel(iso: string, lang: SacramentFormLang = "es"): string {
  const sunday = startOfWeekSundayFromISO(iso);
  const locale = lang === "es" ? "es" : "en-US";
  return sunday.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Move the selected calendar date by whole weeks. */
export function shiftCalendarWeek(iso: string, weekDelta: number): string {
  const d = parseLocalDateFromISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + weekDelta * 7);
  return formatLocalISODate(d);
}

export type TalkResponseStatus = "pending" | "accepted" | "declined";

export type SpeakerSlot = {
  position: number;
  member_id: string | null;
  topic: string | null;
  /** Invitation / follow-up (stored in `sacrament_participations` with prayers). */
  response_status?: TalkResponseStatus;
  response_note?: string | null;
  /** Spoke that Sunday; null = unknown / not yet held. */
  fulfilled?: boolean | null;
};

/** UI default: two speaker slots; DB allows up to eight discourse rows. */
export const MIN_DISCOURSE_SLOTS = 2;
export const MAX_DISCOURSE_SLOTS = 8;

const emptySlot = (p: number): SpeakerSlot => ({
  position: p,
  member_id: null,
  topic: null,
  response_status: "pending",
  response_note: null,
  fulfilled: null,
});

/** DB / API → canonical status (prayers + discourses). */
export function parseTalkResponseStatus(raw: unknown): TalkResponseStatus {
  if (raw === "accepted" || raw === "declined" || raw === "pending") return raw;
  return "pending";
}

/**
 * Canonical discourse slots: positions 1..N where N is between MIN and MAX.
 * Merges incoming rows by position; pads empty slots up to at least MIN_DISCOURSE_SLOTS.
 */
export function normalizeSpeakerSlots(rows: SpeakerSlot[]): SpeakerSlot[] {
  const map = new Map<number, SpeakerSlot>();
  for (const r of rows) {
    if (!Number.isFinite(r.position) || r.position < 1) continue;
    map.set(r.position, r);
  }
  const maxFromRows = map.size > 0 ? Math.max(...map.keys()) : 0;
  const count = Math.min(
    MAX_DISCOURSE_SLOTS,
    Math.max(MIN_DISCOURSE_SLOTS, maxFromRows),
  );
  const out: SpeakerSlot[] = [];
  for (let p = 1; p <= count; p++) {
    const r = map.get(p);
    if (!r) {
      out.push(emptySlot(p));
      continue;
    }
    const legacy = r as SpeakerSlot & {
      talk_response_status?: unknown;
      talk_response_note?: unknown;
      talk_delivered?: unknown;
    };
    const responseStatus = legacy.response_status ?? legacy.talk_response_status;
    const responseNote = legacy.response_note ?? legacy.talk_response_note;
    const fulfilledRaw = legacy.fulfilled ?? legacy.talk_delivered;
    out.push({
      position: p,
      member_id: r.member_id,
      topic: r.topic,
      response_status: parseTalkResponseStatus(responseStatus),
      response_note: (typeof responseNote === "string" ? responseNote : null) ?? null,
      fulfilled: fulfilledRaw === true || fulfilledRaw === false ? fulfilledRaw : null,
    });
  }
  return out;
}
