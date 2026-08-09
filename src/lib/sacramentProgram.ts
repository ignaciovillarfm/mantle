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
  sustainingEntries?: {
    memberId: string;
    callingPositionId: string;
    /** When set, people sharing this id print as one combined line. Optional; same calling alone does not link. */
    linkGroupId?: string;
  }[];
  /** Multi-person releases support; rendered separately in UI. */
  releaseEntries?: {
    memberId: string;
    callingPositionId: string;
    linkGroupId?: string;
  }[];
  /** Multi-person ordinations support; rendered separately in UI. */
  ordinationEntries?: { memberId: string; office: AaronicOffice }[];
  /** Text template key resolved at render-time from DB templates table. */
  templateKey?: string;
  /** @deprecated Single-family storage; migrated into `newMembersEntries` on parse. */
  newMembersNames?: string;
  /** Multi-family new members support (preferred over `newMembersNames`). */
  newMembersEntries?: { familyName: string; familyMembers: string }[];
  /** Multi-item support for `other` (baby blessings, confirmations…); preferred over `body`. */
  otherEntries?: string[];
};

/** Max number of ward-business subsections (Relevos, Sostenimientos, etc.). */
export const MAX_WARD_BUSINESS_SECTIONS = 16;

/** Max rows in the Relevos table inside the add-section modal. */
export const MAX_WARD_BUSINESS_RELEASE_ROWS = 24;

export type SacramentFormLang = "en" | "es";

/** Long meeting date for print header (e.g. "17 de mayo" / "May 17"). */
export function formatSacramentMeetingDateLong(iso: string, lang: SacramentFormLang): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === "es") {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit" }).format(d);
}

/** Default PDF name when saving print preview (`document.title`). */
export function sacramentPrintDocumentTitle(wardName: string, dateLabel: string): string {
  const safeWard = wardName.replace(/[<>:"/\\|?*\n\r]/g, "").trim() || "Ward";
  const safeDate = dateLabel.replace(/[<>:"/\\|?*\n\r]/g, "").trim() || "date";
  return `${safeWard} - ${safeDate}`;
}

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
  /** Preset id from `TESTIMONY_MESSAGES`, or `custom`. */
  testimonyMessageId: string;
  /** Ward-written message when `testimonyMessageId` is `custom`. */
  testimonyMessageCustom: string;
};

/** Intro before the sacrament hymn on the printed program (EN / ES). */
export const SACRAMENT_HYMN_INTRO = {
  en: "We will now prepare for the distribution of the sacrament, and we will do so by singing the hymn...",
  es: "A continuación nos prepararemos para la repartición de los sacramentos y lo haremos cantando el himno...",
} as const;

/** Default copy after the sacrament hymn (EN / ES). */
export const SACRAMENT_REVERENCE_NOTE = {
  en: "We thank you for your reverence during the administration of the sacrament.",
  es: "Les agradecemos por su reverencia durante la administración de la Santa Cena.",
} as const;

export const SACRAMENT_PRIESTHOOD_INSTRUCTION = {
  en: "We thank the priesthood; we ask that you may pass and sit with your families.",
  es: "Agradecemos al sacerdocio y les pedimos que puedan pasar con sus familias.",
} as const;

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
  reverenceNote: SACRAMENT_REVERENCE_NOTE.es,
  priesthoodInstruction: SACRAMENT_PRIESTHOOD_INSTRUCTION.es,
  testimonyMessageId: "",
  testimonyMessageCustom: "",
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
export const NEW_MEMBERS_TEMPLATE_PLACEHOLDERS = ["[Familia y Nombres]", "[Family and names]"] as const;

/** Stored as `"Apellido, Integrantes"` in `newMembersNames`. */
export function parseNewMembersNames(raw: string): { familyName: string; familyMembers: string } {
  const text = raw.trim();
  if (!text) return { familyName: "", familyMembers: "" };
  const firstComma = text.indexOf(",");
  if (firstComma < 0) return { familyName: text, familyMembers: "" };
  return {
    familyName: text.slice(0, firstComma).trim(),
    familyMembers: text.slice(firstComma + 1).trim(),
  };
}

export function formatNewMembersNames(familyName: string, familyMembers: string): string {
  const family = familyName.trim();
  const members = familyMembers.trim();
  if (family && members) return `${family}, ${members}`;
  return family || members;
}

/** Spanish display for integrantes when stored text used English ward-program labels. */
export function localizeNewMembersMembersLine(members: string, lang: SacramentFormLang): string {
  if (lang !== "es" || !members.trim()) return members;
  let out = members;
  out = out.replace(/\bChildren:\s*/gi, "Hijos: ");
  out = out.replace(/\bChild:\s*/gi, "Hijo: ");
  out = out.replace(/\bSpouses:\s*/gi, "Cónyuges: ");
  out = out.replace(/\bSpouse:\s*/gi, "Cónyuge: ");
  out = out.replace(/\s+and\s+/gi, " y ");
  return out;
}

export function newMembersDisplayValues(
  section: Pick<WardBusinessSection, "newMembersNames" | "body">,
  lang: SacramentFormLang,
): { familyName: string; familyMembers: string } {
  const raw = section.newMembersNames?.trim() || section.body?.trim() || "";
  const parsed = parseNewMembersNames(raw);
  return {
    familyName: parsed.familyName,
    familyMembers: localizeNewMembersMembersLine(parsed.familyMembers, lang),
  };
}

/** Every family listed in a `new_members` section, migrating legacy single-family storage. */
export function newMembersSectionEntries(
  section: Pick<WardBusinessSection, "newMembersEntries" | "newMembersNames" | "body">,
): { familyName: string; familyMembers: string }[] {
  const entries = (section.newMembersEntries ?? [])
    .map((e) => ({
      familyName: e.familyName?.trim() ?? "",
      familyMembers: e.familyMembers?.trim() ?? "",
    }))
    .filter((e) => e.familyName || e.familyMembers);
  if (entries.length > 0) return entries;

  const legacy = parseNewMembersNames(section.newMembersNames?.trim() || section.body?.trim() || "");
  return legacy.familyName || legacy.familyMembers ? [legacy] : [];
}

/** Localized family rows for a `new_members` section, ready to render or print. */
export function newMembersSectionDisplayEntries(
  section: Pick<WardBusinessSection, "newMembersEntries" | "newMembersNames" | "body">,
  lang: SacramentFormLang,
): { familyName: string; familyMembers: string }[] {
  return newMembersSectionEntries(section).map((e) => ({
    familyName: e.familyName,
    familyMembers: localizeNewMembersMembersLine(e.familyMembers, lang),
  }));
}

/**
 * Every item listed in an `other` section. Legacy bodies stay a single item because
 * they may be multi-line prose about one event.
 */
export function otherSectionEntries(
  section: Pick<WardBusinessSection, "otherEntries" | "body">,
): string[] {
  const entries = (section.otherEntries ?? []).map((e) => e?.trim() ?? "").filter(Boolean);
  if (entries.length > 0) return entries;
  const body = section.body?.trim() ?? "";
  return body ? [body] : [];
}

/** Splits ward new-members template around the family/names placeholder for print and preview. */
export function splitNewMembersTemplateBody(body: string): { before: string; after: string } {
  const text = body.trim();
  if (!text) return { before: "", after: "" };
  for (const placeholder of NEW_MEMBERS_TEMPLATE_PLACEHOLDERS) {
    const idx = text.indexOf(placeholder);
    if (idx >= 0) {
      const after = text.slice(idx + placeholder.length).trim().replace(/^[.,;:\s]+/, "");
      return {
        before: text.slice(0, idx).trim(),
        after,
      };
    }
  }
  return { before: text, after: "" };
}

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

function wardBusinessMemberCallingRowCount(
  entries: { memberId: string; callingPositionId: string }[],
): number {
  const seen = new Set<string>();
  for (const e of entries) {
    const mid = e.memberId?.trim();
    if (mid) seen.add(mid);
  }
  return seen.size;
}

/** Table/data rows rendered for one ward-business subsection on the print preview. */
export function countWardBusinessSectionPrintRows(sec: WardBusinessSection): number {
  if (sec.kind === "releases") {
    return wardBusinessMemberCallingRowCount(
      (sec.releaseEntries ?? []).map((e) => ({
        memberId: e.memberId,
        callingPositionId: e.callingPositionId,
      })),
    );
  }
  if (sec.kind === "sustainings") {
    return wardBusinessMemberCallingRowCount(
      (sec.sustainingEntries ?? []).map((e) => ({
        memberId: e.memberId,
        callingPositionId: e.callingPositionId,
      })),
    );
  }
  if (sec.kind === "aaron_priesthood_ordination") {
    return (sec.ordinationEntries ?? []).filter((o) => o.memberId?.trim()).length;
  }
  if (sec.kind === "new_members") {
    return newMembersSectionEntries(sec).length;
  }
  if (sec.kind === "other") {
    return otherSectionEntries(sec).length;
  }
  return 0;
}

/**
 * When true, ward business prints on page 2 (back). Rules:
 * - 2+ subsections, or
 * - 1 subsection with 3+ table rows.
 */
export function shouldMoveWardBusinessToPrintBack(sections: WardBusinessSection[] | undefined): boolean {
  const list = sections ?? [];
  if (list.length >= 2) return true;
  if (list.length === 1) return countWardBusinessSectionPrintRows(list[0]) >= 3;
  return false;
}

export function sortWardBusinessSectionsForPrint(sections: WardBusinessSection[]): WardBusinessSection[] {
  return [...sections]
    .map((sec, idx) => ({ sec, idx }))
    .sort((a, b) => {
      const orderDelta = wardBusinessSectionDisplayOrder(a.sec) - wardBusinessSectionDisplayOrder(b.sec);
      if (orderDelta !== 0) return orderDelta;
      return a.idx - b.idx;
    })
    .map(({ sec }) => sec);
}

function dedupeByKey<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

/**
 * Collapses repeated sections of the same kind into a single section, so a ward gets
 * one "Nuevos miembros" / "Otros" block listing every family or event instead of a
 * separate heading per entry.
 */
export function mergeDuplicateWardBusinessSections(
  sections: WardBusinessSection[],
): WardBusinessSection[] {
  const byKind = new Map<WardBusinessSectionKind, WardBusinessSection>();
  const order: WardBusinessSectionKind[] = [];

  for (const sec of sections) {
    const existing = byKind.get(sec.kind);
    if (!existing) {
      const seeded: WardBusinessSection = { ...sec };
      if (sec.kind === "new_members") {
        seeded.newMembersEntries = newMembersSectionEntries(sec);
      }
      if (sec.kind === "other") {
        seeded.otherEntries = otherSectionEntries(sec);
      }
      byKind.set(sec.kind, seeded);
      order.push(sec.kind);
      continue;
    }

    if (sec.kind === "releases") {
      existing.releaseEntries = dedupeByKey(
        [...(existing.releaseEntries ?? []), ...(sec.releaseEntries ?? [])],
        (e) => `${e.memberId}::${e.callingPositionId}::${e.linkGroupId ?? ""}`,
      );
    } else if (sec.kind === "sustainings") {
      existing.sustainingEntries = dedupeByKey(
        [...(existing.sustainingEntries ?? []), ...(sec.sustainingEntries ?? [])],
        (e) => `${e.memberId}::${e.callingPositionId}::${e.linkGroupId ?? ""}`,
      );
    } else if (sec.kind === "aaron_priesthood_ordination") {
      existing.ordinationEntries = dedupeByKey(
        [...(existing.ordinationEntries ?? []), ...(sec.ordinationEntries ?? [])],
        (e) => `${e.memberId}::${e.office}`,
      );
    } else if (sec.kind === "new_members") {
      existing.newMembersEntries = dedupeByKey(
        [...(existing.newMembersEntries ?? []), ...newMembersSectionEntries(sec)],
        (e) => `${e.familyName}::${e.familyMembers}`,
      );
    } else {
      existing.otherEntries = dedupeByKey(
        [...(existing.otherEntries ?? []), ...otherSectionEntries(sec)],
        (e) => e,
      );
    }
  }

  return order.map((kind) => byKind.get(kind)!);
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
  /**
   * Explicit companion group. People with the same `link_group_id` print as one line.
   * Same calling without a shared link id stays as separate individual lines.
   */
  link_group_id: string | null;
};

export type AaronicOffice = "deacon" | "teacher" | "priest" | "";

export type WardBusinessOrdinationRow = {
  id: string;
  member_id: string | null;
  office: AaronicOffice;
};

/** Nuevos miembros: one row per family inside a single section. */
export type WardBusinessNewMembersRow = {
  id: string;
  familyName: string;
  familyMembers: string;
};

/** Otros: one row per event (baby blessing, confirmation…) inside a single section. */
export type WardBusinessOtherRow = {
  id: string;
  text: string;
};

/** Values collected in the “add ward business section” modal before building `body`. */
export type WardBusinessModalFields = {
  /** Sostenimientos / ordenación: ward member for scripted name line. */
  personMemberId: string | null;
  /** Sostenimientos: `calling_positions.id` for [Cargo] line. */
  callingPositionId: string | null;
  aaronicOffice: AaronicOffice;
  /** Relevos: one row per person (nombre + cargo). */
  releaseRows: WardBusinessReleaseRow[];
  /** Sostenimientos: one row per person (nombre + cargo); optional link_group_id for companions. */
  sustainingRows: WardBusinessReleaseRow[];
  /** Ordenación: one row per person (nombre + oficio). */
  ordinationRows: WardBusinessOrdinationRow[];
  /** Nuevos miembros: one row per family. */
  newMembersRows: WardBusinessNewMembersRow[];
  /** Otros: one row per event. */
  otherRows: WardBusinessOtherRow[];
};

export function newWardBusinessReleaseRow(): WardBusinessReleaseRow {
  return { id: newWardSectionId(), member_id: null, calling_position_id: null, link_group_id: null };
}

export function newWardBusinessOrdinationRow(): WardBusinessOrdinationRow {
  return { id: newWardSectionId(), member_id: null, office: "" };
}

export function newWardBusinessNewMembersRow(): WardBusinessNewMembersRow {
  return { id: newWardSectionId(), familyName: "", familyMembers: "" };
}

export function newWardBusinessOtherRow(): WardBusinessOtherRow {
  return { id: newWardSectionId(), text: "" };
}

export function initialWardBusinessModalFields(): WardBusinessModalFields {
  return {
    personMemberId: null,
    callingPositionId: null,
    aaronicOffice: "",
    releaseRows: [newWardBusinessReleaseRow()],
    sustainingRows: [newWardBusinessReleaseRow()],
    ordinationRows: [newWardBusinessOrdinationRow()],
    newMembersRows: [newWardBusinessNewMembersRow()],
    otherRows: [newWardBusinessOtherRow()],
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
    const items = fields.otherRows.map((r) => r.text.trim()).filter(Boolean);
    return {
      title,
      body: items.length > 0 ? items.join("\n") : defaultWardBusinessSectionBody("other", lang),
    };
  }

  if (kind === "releases") {
    return { title, body: "" };
  }

  if (kind === "new_members") {
    const first = fields.newMembersRows[0];
    return {
      title,
      body: first ? formatNewMembersNames(first.familyName, first.familyMembers) : "",
    };
  }

  if (kind === "sustainings") {
    return { title, body: "" };
  }

  const template = defaultWardBusinessSectionBody("aaron_priesthood_ordination", lang);
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
    const newMembersEntries = Array.isArray(row.newMembersEntries)
      ? row.newMembersEntries
          .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
          .map((e) => ({
            familyName: typeof e.familyName === "string" ? e.familyName.trim() : "",
            familyMembers: typeof e.familyMembers === "string" ? e.familyMembers.trim() : "",
          }))
          .filter((e) => e.familyName || e.familyMembers)
      : [];
    if (newMembersEntries.length > 0) {
      section.newMembersEntries = newMembersEntries;
    }
    const otherEntries = Array.isArray(row.otherEntries)
      ? row.otherEntries
          .map((e) => (typeof e === "string" ? e.trim() : ""))
          .filter((e) => e.length > 0)
      : [];
    if (otherEntries.length > 0) {
      section.otherEntries = otherEntries;
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
            linkGroupId:
              typeof e.linkGroupId === "string" && e.linkGroupId.trim().length > 0
                ? e.linkGroupId.trim()
                : undefined,
          }))
          .filter((e) => e.memberId)
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
            linkGroupId:
              typeof e.linkGroupId === "string" && e.linkGroupId.trim().length > 0
                ? e.linkGroupId.trim()
                : undefined,
          }))
          .filter((e) => e.memberId)
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
  wardBusinessSections = mergeDuplicateWardBusinessSections(wardBusinessSections);

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
    testimonyMessageId:
      typeof o.testimonyMessageId === "string" ? o.testimonyMessageId : "",
    testimonyMessageCustom:
      typeof o.testimonyMessageCustom === "string" ? o.testimonyMessageCustom : "",
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

export type SacramentMeetingProgramKind = "regular" | "testimony" | "general_conference";

/** Which Sunday of the calendar month (1–5); `sunday` must fall on a Sunday. */
export function nthSundayOfMonth(sunday: Date): number {
  const y = sunday.getFullYear();
  const m = sunday.getMonth();
  let n = 0;
  for (let day = 1; day <= sunday.getDate(); day++) {
    if (new Date(y, m, day).getDay() === 0) n++;
  }
  return n;
}

/** April and October: testimony is on the 2nd Sunday (1st is General Conference weekend). */
export function isGeneralConferenceMonth(monthIndex: number): boolean {
  return monthIndex === 3 || monthIndex === 9;
}

/**
 * Whether this sacrament week uses assigned discourses or testimony / General Conference.
 * - Most months: 1st Sunday = testimony.
 * - April & October: 1st Sunday = General Conference; 2nd Sunday = testimony.
 */
export function sacramentMeetingProgramKind(meetingWeekIso: string): SacramentMeetingProgramKind {
  const sunday = startOfWeekSundayFromISO(meetingWeekIso);
  const nth = nthSundayOfMonth(sunday);
  const month = sunday.getMonth();

  if (isGeneralConferenceMonth(month) && nth === 1) return "general_conference";
  if (isGeneralConferenceMonth(month)) return nth === 2 ? "testimony" : "regular";
  return nth === 1 ? "testimony" : "regular";
}

export function hasAssignedDiscourses(kind: SacramentMeetingProgramKind): boolean {
  return kind === "regular";
}

export function sacramentMeetingKindSectionTitle(
  kind: SacramentMeetingProgramKind,
  lang: SacramentFormLang,
): string {
  if (kind === "testimony") return lang === "es" ? "Testimonios" : "Testimonies";
  if (kind === "general_conference") return lang === "es" ? "Conferencia General" : "General Conference";
  return lang === "es" ? "Discursos" : "Speakers";
}

export function sacramentMeetingKindNotice(
  kind: SacramentMeetingProgramKind,
  lang: SacramentFormLang,
): string {
  if (kind === "testimony") {
    return lang === "es"
      ? "Reunión de testimonios del barrio. No se asignan discursos."
      : "Ward testimony meeting. No talks are assigned.";
  }
  if (kind === "general_conference") {
    return lang === "es"
      ? "Conferencia General de la Iglesia. No hay discursos del barrio."
      : "Church General Conference. No ward talks are scheduled.";
  }
  return "";
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
  /** Stake / visitor name when not a ward member (`member_id` null). */
  guest_name?: string | null;
  topic: string | null;
  /** Invitation / follow-up (stored in `sacrament_participations` with prayers). */
  response_status?: TalkResponseStatus;
  response_note?: string | null;
  /** Spoke that Sunday; null = unknown / not yet held. */
  fulfilled?: boolean | null;
};

/** Guest/stake mode: `guest_name` is set (including empty while typing); ward mode uses `member_id`. */
export function isGuestSpeakerSlot(slot: SpeakerSlot): boolean {
  return slot.guest_name !== null && slot.guest_name !== undefined;
}

export function speakerSlotDisplayName(
  slot: SpeakerSlot,
  memberNameById: Map<string, string> | ReadonlyMap<string, string>,
): string {
  const guest = slot.guest_name?.trim();
  if (guest) return guest;
  if (slot.member_id) return memberNameById.get(slot.member_id) ?? "";
  return "";
}

/** UI default: two speaker slots; DB allows up to eight discourse rows. */
export const MIN_DISCOURSE_SLOTS = 2;
export const MAX_DISCOURSE_SLOTS = 8;

const emptySlot = (p: number): SpeakerSlot => ({
  position: p,
  member_id: null,
  guest_name: null,
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
    const guestRaw = r.guest_name;
    out.push({
      position: p,
      member_id: r.member_id,
      guest_name: r.member_id
        ? null
        : typeof guestRaw === "string"
          ? guestRaw
          : guestRaw === null
            ? null
            : null,
      topic: r.topic,
      response_status: parseTalkResponseStatus(responseStatus),
      response_note: (typeof responseNote === "string" ? responseNote : null) ?? null,
      fulfilled: fulfilledRaw === true || fulfilledRaw === false ? fulfilledRaw : null,
    });
  }
  return out;
}

/** Splits inline " - Next announcement" when a new item clearly starts (Spanish program copy). */
const INLINE_ANNOUNCEMENT_SPLIT =
  /\s+-\s+(?=Recordamos|Les invitamos|Les recordamos|Se invita|Se extiende|El día|\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))/i;

function normalizeAnnouncementLine(line: string): string {
  return line.replace(/^[\s\-–—•*]+/, "").trim();
}

/** One row per announcement for print / multi-line editor (newline-separated in storage). */
export function parseAnnouncementRows(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  const rows: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(INLINE_ANNOUNCEMENT_SPLIT);
    if (parts.length <= 1) {
      const normalized = normalizeAnnouncementLine(trimmed);
      if (normalized) rows.push(normalized);
    } else {
      for (const part of parts) {
        const normalized = normalizeAnnouncementLine(part);
        if (normalized) rows.push(normalized);
      }
    }
  }
  return rows;
}

export function serializeAnnouncementRows(rows: readonly string[]): string {
  return rows.map((row) => row.trim()).filter(Boolean).join("\n");
}
