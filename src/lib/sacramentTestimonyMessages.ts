import {
  formatLocalISODate,
  parseLocalDateFromISO,
  sacramentMeetingProgramKind,
  type SacramentFormLang,
  type SacramentProgramBody,
} from "./sacramentProgram";

export const TESTIMONY_MESSAGE_CUSTOM_ID = "custom";

export type TestimonyMessage = {
  id: string;
  author: { en: string; es: string };
  verb: { en: string; es: string };
  quote: { en: string; es: string };
};

export const TESTIMONY_MESSAGES: TestimonyMessage[] = [
  {
    id: "packer-share",
    author: { en: "Boyd K. Packer", es: "Boyd K. Packer" },
    verb: { en: "taught", es: "enseñó" },
    quote: {
      en: "A testimony is to be found in the bearing of it.",
      es: "Un testimonio se encuentra al compartirlo.",
    },
  },
  {
    id: "bednar-knowledge",
    author: { en: "Boyd K. Packer", es: "David A. Bednar" },
    verb: { en: "taught", es: "dijo" },
    quote: {
      en: "Each of us must come to our own personal testimony of the Lord Jesus Christ. We then share that testimony with our family and others.",
      es: "El testimonio es conocimiento espiritual dado por el Espíritu Santo.",
    },
  },
  {
    id: "holland-hold",
    author: { en: "M. Russell Ballard", es: "Jeffrey R. Holland" },
    verb: { en: "said", es: "enseñó" },
    quote: {
      en: "Testimony—real testimony, born of the Spirit and confirmed by the Holy Ghost—changes lives.",
      es: "Aférrense al testimonio que ya tienen.",
    },
  },
  {
    id: "hinckley-christ",
    author: { en: "Jeffrey R. Holland", es: "Gordon B. Hinckley" },
    verb: { en: "taught", es: "dijo" },
    quote: {
      en: "Hold fast to what you already know.",
      es: "Un testimonio verdadero siempre se centra en Jesucristo.",
    },
  },
  {
    id: "nelson-nourish",
    author: { en: "Dieter F. Uchtdorf", es: "Russell M. Nelson" },
    verb: { en: "taught", es: "enseñó" },
    quote: {
      en: "The testimony of Jesus is the spirit of prophecy.",
      es: "Su testimonio necesita nutrirse constantemente mediante la oración y el estudio.",
    },
  },
  {
    id: "andersen-express",
    author: { en: "Gordon B. Hinckley", es: "Neil L. Andersen" },
    verb: { en: "said", es: "dijo" },
    quote: {
      en: "A testimony is the anchor of faith.",
      es: "El testimonio crece al expresarlo.",
    },
  },
  {
    id: "hales-strengthen",
    author: { en: "David A. Bednar", es: "Robert D. Hales" },
    verb: { en: "taught", es: "enseñó" },
    quote: {
      en: "Testimony is spiritual knowledge.",
      es: "Un testimonio no es algo que se da una sola vez; debe fortalecerse continuamente.",
    },
  },
  {
    id: "oaks-share",
    author: { en: "Thomas S. Monson", es: "Dallin H. Oaks" },
    verb: { en: "said", es: "dijo" },
    quote: {
      en: "Your testimony is strengthened when you share it.",
      es: "Compartimos nuestro testimonio mediante lo que decimos y lo que hacemos.",
    },
  },
];

const MESSAGE_BY_ID = new Map(TESTIMONY_MESSAGES.map((m) => [m.id, m]));

export function getTestimonyMessageById(id: string): TestimonyMessage | undefined {
  return MESSAGE_BY_ID.get(id);
}

export type TestimonyMessageUsage = { id: string; date: string };

/** IDs used on testimony Sundays within the last ~2 months (excluding `custom`). */
export function testimonyIdsUsedWithinMonths(
  usage: TestimonyMessageUsage[],
  beforeDateIso: string,
  months = 2,
): Set<string> {
  const before = parseLocalDateFromISO(beforeDateIso);
  const cutoff = new Date(before.getFullYear(), before.getMonth() - months, before.getDate());
  const cutoffIso = formatLocalISODate(cutoff);
  const used = new Set<string>();
  for (const row of usage) {
    if (row.id === TESTIMONY_MESSAGE_CUSTOM_ID || !row.id) continue;
    if (row.date >= cutoffIso && row.date < beforeDateIso) used.add(row.id);
  }
  return used;
}

export function suggestTestimonyMessageId(
  usage: TestimonyMessageUsage[],
  meetingDateIso: string,
): string {
  const recentlyUsed = testimonyIdsUsedWithinMonths(usage, meetingDateIso, 2);
  const available = TESTIMONY_MESSAGES.filter((m) => !recentlyUsed.has(m.id));
  if (available.length > 0) return available[0].id;

  const usageById = new Map<string, string>();
  for (const row of usage) {
    if (row.id === TESTIMONY_MESSAGE_CUSTOM_ID || !row.id) continue;
    if (!usageById.has(row.id) || row.date > usageById.get(row.id)!) {
      usageById.set(row.id, row.date);
    }
  }
  let oldestId = TESTIMONY_MESSAGES[0].id;
  let oldestDate = "9999-99-99";
  for (const m of TESTIMONY_MESSAGES) {
    const last = usageById.get(m.id);
    if (!last) return m.id;
    if (last < oldestDate) {
      oldestDate = last;
      oldestId = m.id;
    }
  }
  return oldestId;
}

export function formatTestimonyMessageLines(
  program: Pick<SacramentProgramBody, "testimonyMessageId" | "testimonyMessageCustom">,
  lang: SacramentFormLang,
): { attribution: string; quote: string } | null {
  const custom = program.testimonyMessageCustom?.trim();
  if (program.testimonyMessageId === TESTIMONY_MESSAGE_CUSTOM_ID && custom) {
    return { attribution: "", quote: custom };
  }
  const preset = program.testimonyMessageId
    ? getTestimonyMessageById(program.testimonyMessageId)
    : undefined;
  if (!preset) return custom ? { attribution: "", quote: custom } : null;
  return {
    attribution: `${preset.author[lang]} ${preset.verb[lang]}:`,
    quote: preset.quote[lang],
  };
}

export function extractTestimonyUsageFromMeetings(
  rows: { date: string; program: unknown }[],
): TestimonyMessageUsage[] {
  const out: TestimonyMessageUsage[] = [];
  for (const row of rows) {
    if (sacramentMeetingProgramKind(row.date) !== "testimony") continue;
    const p = row.program as Record<string, unknown> | null;
    if (!p || typeof p !== "object") continue;
    const id = typeof p.testimonyMessageId === "string" ? p.testimonyMessageId.trim() : "";
    if (!id) continue;
    out.push({ id, date: row.date });
  }
  return out;
}
