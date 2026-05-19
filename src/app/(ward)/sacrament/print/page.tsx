import { loadSacramentPageState } from "../loadSacramentState";
import { PrintButton } from "./PrintButton";
import { PrintDocumentTitle } from "./PrintDocumentTitle";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import {
  formatLocalISODate,
  formatSacramentMeetingDateLong,
  parseAnnouncementRows,
  sacramentPrintDocumentTitle,
  SACRAMENT_HYMN_INTRO,
  SACRAMENT_PRIESTHOOD_INSTRUCTION,
  SACRAMENT_REVERENCE_NOTE,
  startOfWeekSundayFromISO,
  upcomingSacramentSunday,
  hasAssignedDiscourses,
  sacramentMeetingKindNotice,
  sacramentMeetingKindSectionTitle,
  sacramentMeetingProgramKind,
  shouldMoveWardBusinessToPrintBack,
  type SacramentProgramBody,
  sortWardBusinessSectionsForPrint,
  type SacramentFormLang,
} from "@/lib/sacramentProgram";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { formatTestimonyMessageLines } from "@/lib/sacramentTestimonyMessages";
import { FixedRowsTable, WardBusinessPrintBody } from "./printPrimitives";

function t(lang: SacramentFormLang, en: string, es: string): string {
  return lang === "es" ? es : en;
}

type PrintSearchParams = { ward?: string; date?: string; lang?: string };

async function resolvePrintPageParams(sp: PrintSearchParams) {
  const lang: SacramentFormLang = sp.lang === "en" ? "en" : "es";
  const wardRoles = await fetchUserWardRoles();
  const wardsMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (!wardsMap.has(r.ward_id)) wardsMap.set(r.ward_id, r.wards?.name ?? "Ward");
  }
  const wardId = sp.ward && wardsMap.has(sp.ward) ? sp.ward : wardsMap.keys().next().value;
  const meetingDateRaw = sp.date?.trim();
  const rawIso =
    meetingDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(meetingDateRaw)
      ? meetingDateRaw
      : formatLocalISODate(upcomingSacramentSunday());
  const meetingDate = formatLocalISODate(startOfWeekSundayFromISO(rawIso));
  const wardName = wardId ? (wardsMap.get(wardId) ?? "Ward") : "Ward";
  const formattedDate = formatSacramentMeetingDateLong(meetingDate, lang);
  const documentTitle = sacramentPrintDocumentTitle(wardName, formattedDate);
  return { lang, wardId, wardName, meetingDate, meetingDateRaw, formattedDate, documentTitle };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<PrintSearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const { lang, documentTitle } = await resolvePrintPageParams(sp);
  if (!documentTitle) {
    return { title: lang === "es" ? "Programa sacramental" : "Sacrament program" };
  }
  return { title: documentTitle };
}

/** Compact pause marker between bordered sections (boxes carry the main visual break). */
function PauseDivider({ lang }: { lang: SacramentFormLang }) {
  const label = t(lang, "Pause", "Pausa");
  return (
    <div
      className="print-pause-divider flex shrink-0 items-center justify-center gap-2 opacity-50 print:break-inside-avoid"
      role="separator"
      aria-label={label}
    >
      <span className="block h-0 w-10 shrink-0 border-t border-neutral-500/50" aria-hidden />
      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600/70">{label}</span>
      <span className="block h-0 w-10 shrink-0 border-t border-neutral-500/50" aria-hidden />
    </div>
  );
}

function PrintSectionBox({ children }: { children: ReactNode }) {
  return (
    <div className="m-0 space-y-2 border border-black p-3 print:break-inside-avoid">{children}</div>
  );
}

/** Label + value or underline on one row (table layout for reliable PDF). */
function PrintLabelValueCell({
  label,
  value,
  emptyFallback,
  compactUnderline,
}: {
  label: string;
  value: string;
  emptyFallback?: string;
  /** Shorter line after the label (e.g. stake business, one or two names). */
  compactUnderline?: boolean;
}) {
  const trimmed = value.trim();
  const display = trimmed || emptyFallback || "";
  const showUnderline = !trimmed && !emptyFallback;
  return (
    <table
      className={`border-collapse ${compactUnderline ? "w-max max-w-full" : "w-full"}`}
    >
      <tbody>
        <tr>
          <td className="whitespace-nowrap pr-1 align-baseline font-semibold">{label}:</td>
          {showUnderline ? (
            <td
              className={`border-b border-black align-bottom ${compactUnderline ? "w-56 min-w-56 max-w-56" : "w-full"}`}
            >
              <span className="inline-block min-h-[1em] w-full" aria-hidden>
                {"\u00A0"}
              </span>
            </td>
          ) : (
            <td
              className={`align-baseline whitespace-pre-wrap ${compactUnderline ? "max-w-56" : "w-full"}`}
            >
              {display}
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

/** Single-column label + value/underline for print/PDF. */
function PrintLabelLine({ label, value }: { label: string; value: string }) {
  return <PrintLabelValueCell label={label} value={value} />;
}

/** Two-column row for print/PDF — keeps label + underline on one line. */
function PrintLabelPairRow({
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        <tr className="align-top">
          <td className="w-1/2 py-0 pr-3 align-top">
            <PrintLabelValueCell label={leftLabel} value={leftValue} emptyFallback="________" />
          </td>
          <td className="w-1/2 py-0 pl-3 align-top">
            <PrintLabelValueCell label={rightLabel} value={rightValue} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default async function SacramentPrintPage({
  searchParams,
}: {
  searchParams: Promise<PrintSearchParams>;
}) {
  const sp = await searchParams;
  const { lang, wardId, wardName, meetingDate, meetingDateRaw, formattedDate, documentTitle } =
    await resolvePrintPageParams(sp);
  if (!wardId) {
    return <div>{t(lang, "No ward access.", "Sin acceso a barrio.")}</div>;
  }

  if (meetingDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(meetingDateRaw) && meetingDate !== meetingDateRaw) {
    const q = new URLSearchParams();
    q.set("ward", wardId);
    q.set("date", meetingDate);
    q.set("lang", lang);
    redirect(`/sacrament/print?${q.toString()}`);
  }

  const state = await loadSacramentPageState(wardId, meetingDate);
  const meeting = state.meeting;
  const program = meeting?.program;
  const memberNameById = new Map((state.members ?? []).map((m) => [m.id, m.name]));
  const callingById = new Map(
    (state.callingPositions ?? []).map((p) => [p.id, lang === "es" ? p.titleEs : p.titleEn]),
  );
  const printTitleLine1 =
    lang === "es" ? `Reunión sacramental del barrio ${wardName}` : `Sacrament meeting program for ${wardName}`;
  const printTitleLine2 = formattedDate;
  const printableSpeakers = (state.speakers ?? []).filter((s) => s.fulfilled !== false);
  const meetingProgramKind = sacramentMeetingProgramKind(meetingDate);
  const showDiscourseSlots = hasAssignedDiscourses(meetingProgramKind);
  const testimonyMessageLines =
    meetingProgramKind === "testimony" && program
      ? formatTestimonyMessageLines(program as SacramentProgramBody, lang)
      : null;
  const sacramentHymnIntro = lang === "es" ? SACRAMENT_HYMN_INTRO.es : SACRAMENT_HYMN_INTRO.en;
  const reverenceNote = lang === "es" ? SACRAMENT_REVERENCE_NOTE.es : SACRAMENT_REVERENCE_NOTE.en;
  const priesthoodInstruction =
    lang === "es" ? SACRAMENT_PRIESTHOOD_INSTRUCTION.es : SACRAMENT_PRIESTHOOD_INSTRUCTION.en;
  const wardBusinessSections = sortWardBusinessSectionsForPrint(program?.wardBusinessSections ?? []);
  const wardBusinessOnBackPage = shouldMoveWardBusinessToPrintBack(program?.wardBusinessSections);

  const wardBusinessHeading = (
    <h2 className="mb-1 text-[15px] font-semibold uppercase tracking-wide">
      {t(lang, "Ward Business", "Asuntos del barrio")}
    </h2>
  );

  const wardBusinessContent = (
    <>
      {wardBusinessHeading}
      <WardBusinessPrintBody
        sections={wardBusinessSections}
        lang={lang}
        sectionTemplates={state.sectionTemplates}
        memberNameById={memberNameById}
        callingById={callingById}
      />
    </>
  );

  return (
    <main className="mx-auto max-w-[860px] bg-white px-6 py-6 text-black print:max-w-none print:px-4 print:py-3">
      <PrintDocumentTitle title={documentTitle} />
      <style>{`
        @media print {
          @page { size: Letter; margin: 10mm; }
          .no-print { display: none !important; }
          .print-tight * { line-height: 1.15; }
          .print-pause-divider { opacity: 0.45 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page-back {
            break-before: page;
            page-break-before: always;
          }
          body * { visibility: hidden !important; }
          main, main * { visibility: visible !important; }
          main {
            position: absolute;
            inset: 0;
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
          }
        }
        .print-page-back {
          margin-top: 2rem;
          padding-top: 1.25rem;
          border-top: 2px dashed #bbb;
        }
        .print-page-label {
          margin-bottom: 0.75rem;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #666;
        }
      `}</style>
      <div className="no-print mb-4 flex items-center justify-end">
        <PrintButton
          label={t(lang, "Print / Save PDF", "Imprimir / Guardar PDF")}
          documentTitle={documentTitle}
        />
      </div>

      <section className="print-tight text-[15px]">
        <header className="mb-2 text-center">
          <h1 className="text-[22px] font-semibold uppercase leading-snug tracking-wide">{printTitleLine1}</h1>
          <p className="mt-1 text-[15px] font-medium leading-snug">{printTitleLine2}</p>
        </header>

        <div className="print-page-front flex flex-col gap-2">
        <PrintSectionBox>
        <div className="space-y-1.5">
          <PrintLabelLine
            label={t(lang, "Recognition of authorities", "Reconocimiento de las autoridades")}
            value={program?.recognitionNote ?? ""}
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-1.5">
            <div>
              <span className="font-semibold">{t(lang, "Presides", "Preside")}:</span>{" "}
              {memberNameById.get(meeting?.presiding_member_id ?? "") ?? "________"}
            </div>
            <div>
              <span className="font-semibold">{t(lang, "Conducts", "Dirige")}:</span>{" "}
              {memberNameById.get(meeting?.conducting_id ?? "") ?? "________"}
            </div>
            <div>
              <span className="font-semibold">{t(lang, "Chorister", "Corista")}:</span>{" "}
              {memberNameById.get(meeting?.chorister_member_id ?? "") ?? "________"}
            </div>
            <div>
              <span className="font-semibold">{t(lang, "Organist", "Organista")}:</span>{" "}
              {memberNameById.get(meeting?.organist_member_id ?? "") ?? "________"}
            </div>
          </div>
          <div className="pt-1.5">
            <span className="font-semibold">{t(lang, "Announcements", "Anuncios")}:</span>
          </div>
          <div className="mt-1">
            <FixedRowsTable
              rows={(() => {
                const rows = parseAnnouncementRows(program?.announcements ?? "");
                return rows.length > 0 ? rows : [""];
              })()}
            />
          </div>
          <div className="mt-2">
            <PrintLabelPairRow
              leftLabel={t(lang, "Opening Hymn", "Himno inicial")}
              leftValue={program?.openingHymn ?? ""}
              rightLabel={t(lang, "Opening Prayer", "Primera oración")}
              rightValue={memberNameById.get(meeting?.opening_prayer_member_id ?? "") ?? ""}
            />
          </div>
        </div>
        </PrintSectionBox>
        <PauseDivider lang={lang} />

        <PrintSectionBox>
        {wardBusinessOnBackPage ? (
            <div className="pb-2">
              {wardBusinessHeading}
              <p className="text-[13px] leading-snug text-neutral-800">
                {t(
                  lang,
                  "Ward business is printed on the reverse side of this page.",
                  "Los asuntos del barrio se imprimen al reverso de esta hoja.",
                )}
              </p>
            </div>
        ) : wardBusinessSections.length > 0 ? (
          wardBusinessContent
        ) : (
          <div className="pb-2">
            {wardBusinessHeading}
            <p className="text-[13px] leading-snug text-neutral-800">
              {t(lang, "No ward business today.", "No hay asuntos hoy.")}
            </p>
          </div>
        )}

        <div className="pt-2">
          <PrintLabelValueCell
            label={t(lang, "Stake Business", "Asuntos de la estaca")}
            value={program?.stakeBusiness ?? ""}
            compactUnderline
          />
        </div>

        <div className="pt-2">
          <h2 className="mb-1 text-[15px] font-semibold uppercase tracking-wide">
            {t(lang, "Sacrament Service", "Servicio sacramental")}
          </h2>
          <p className="pt-1 text-[14px] leading-snug">{sacramentHymnIntro}</p>
          <div className="pt-1">
            <span className="font-semibold">{t(lang, "Sacrament Hymn", "Himno sacramental")}:</span>{" "}
            {program?.sacramentHymn?.trim() || "________"}
          </div>
        </div>
        </PrintSectionBox>
        <PauseDivider lang={lang} />

        <PrintSectionBox>
        <div className="space-y-2 text-[14px] leading-snug">
          <div className="space-y-1">
            <p>{reverenceNote}</p>
            <p>{priesthoodInstruction}</p>
          </div>
          <div className="space-y-2">
            <h2 className="text-[15px] font-semibold uppercase tracking-wide">
              {sacramentMeetingKindSectionTitle(meetingProgramKind, lang)}
            </h2>
            {showDiscourseSlots ? (
              <FixedRowsTable
                rows={printableSpeakers.map((s) => {
                  const name =
                    s.guest_name?.trim() ||
                    memberNameById.get(s.member_id ?? "") ||
                    "—";
                  return name + (s.topic ? ` - ${s.topic}` : "");
                })}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] leading-snug">
                  {sacramentMeetingKindNotice(meetingProgramKind, lang)}
                </p>
                {testimonyMessageLines ? (
                  <div className="border-t border-border/60 pt-2 text-[13px] leading-snug">
                    {testimonyMessageLines.attribution ? (
                      <p className="font-medium">{testimonyMessageLines.attribution}</p>
                    ) : null}
                    <p className={testimonyMessageLines.attribution ? "italic" : ""}>
                      “{testimonyMessageLines.quote}”
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
        </PrintSectionBox>
        <PauseDivider lang={lang} />

        <PrintSectionBox>
        <div className="space-y-2 text-[14px] leading-snug">
          <h2 className="text-[15px] font-semibold uppercase tracking-wide">{t(lang, "Closing", "Cierre")}</h2>
          <PrintLabelLine
            label={t(lang, "Closing Hymn", "Último himno")}
            value={program?.closingHymn ?? ""}
          />
          <PrintLabelLine
            label={t(lang, "Closing Prayer", "Última oración")}
            value={memberNameById.get(meeting?.closing_prayer_member_id ?? "") ?? ""}
          />
        </div>
        </PrintSectionBox>
        </div>

        {wardBusinessOnBackPage && wardBusinessSections.length > 0 ? (
          <div className="print-page-back">
            <p className="print-page-label no-print">
              {t(lang, "Page 2 (back)", "Página 2 (reverso)")}
            </p>
            <PrintSectionBox>{wardBusinessContent}</PrintSectionBox>
          </div>
        ) : null}
      </section>
    </main>
  );
}

