import { loadSacramentPageState } from "../loadSacramentState";
import { PrintButton } from "./PrintButton";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import {
  formatLocalISODate,
  startOfWeekSundayFromISO,
  upcomingSacramentSunday,
  wardBusinessSectionDisplayOrder,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
} from "@/lib/sacramentProgram";
import { redirect } from "next/navigation";

function t(lang: SacramentFormLang, en: string, es: string): string {
  return lang === "es" ? es : en;
}

function formatMeetingDateLong(iso: string, lang: SacramentFormLang): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (lang === "es") {
    return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "long" }).format(d);
  }
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit" }).format(d);
}

function PauseDivider({ lang }: { lang: SacramentFormLang }) {
  return (
    <div className="my-3 flex items-center gap-2 text-[11px] uppercase tracking-wide text-black/70">
      <span className="block h-0 w-full flex-1 border-t border-black" />
      {t(lang, "Pause", "Pausa")}
      <span className="block h-0 w-full flex-1 border-t border-black" />
    </div>
  );
}

function FillLine({ minWidthClass = "min-w-[180px]" }: { minWidthClass?: string }) {
  return <span className={`inline-block h-[1em] align-baseline border-b border-black ${minWidthClass}`} />;
}

function FixedRowsTable({
  rows,
  showIndex = false,
  rightLabel,
}: {
  rows: string[];
  showIndex?: boolean;
  rightLabel?: string;
}) {
  return (
    <table className="w-full border border-black border-collapse text-[13px]">
      <tbody>
        {rows.map((row, i) => (
          <tr key={`r-${i}`}>
            {showIndex ? <td className="w-8 border border-black px-1 text-center">{i + 1}</td> : null}
            <td className="border border-black px-2 py-[2px]">{row || "\u00A0"}</td>
            {rightLabel ? <td className="w-10 border border-black px-1 text-center">{rightLabel}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function sectionTemplateText(
  templateKey: string | undefined,
  templates: Record<string, { en?: string; es?: string }>,
  lang: SacramentFormLang,
): string {
  if (!templateKey) return "";
  const row = templates[templateKey];
  if (!row) return "";
  return (lang === "es" ? row.es : row.en) ?? "";
}

export default async function SacramentPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ ward?: string; date?: string; lang?: string }>;
}) {
  const sp = await searchParams;
  const lang: SacramentFormLang = sp.lang === "en" ? "en" : "es";
  const wardRoles = await fetchUserWardRoles();
  const wardsMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (!wardsMap.has(r.ward_id)) wardsMap.set(r.ward_id, r.wards?.name ?? "Ward");
  }
  const wardId = sp.ward && wardsMap.has(sp.ward) ? sp.ward : wardsMap.keys().next().value;
  if (!wardId) {
    return <div>{t(lang, "No ward access.", "Sin acceso a barrio.")}</div>;
  }

  const meetingDateRaw = sp.date?.trim();
  const rawIso =
    meetingDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(meetingDateRaw)
      ? meetingDateRaw
      : formatLocalISODate(upcomingSacramentSunday());
  const meetingDate = formatLocalISODate(startOfWeekSundayFromISO(rawIso));
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
  const wardName = wardsMap.get(wardId) ?? "—";
  const formattedDate = formatMeetingDateLong(meetingDate, lang);
  const printTitleLine1 =
    lang === "es" ? `Reunión sacramental del barrio ${wardName}` : `Sacrament meeting program for ${wardName}`;
  const printTitleLine2 = formattedDate;
  const printableSpeakers = (state.speakers ?? []).filter((s) => s.fulfilled !== false);
  // #region agent log
  void fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "sacrament-print-manual-lines-debug-1",
      hypothesisId: "H13",
      location: "print/page.tsx:manualFillLines",
      message: "Computed blank fields that should render long manual fill lines",
      data: {
        hasOpeningPrayerName: Boolean(memberNameById.get(meeting?.opening_prayer_member_id ?? "")),
        hasClosingPrayerName: Boolean(memberNameById.get(meeting?.closing_prayer_member_id ?? "")),
        hasStakeBusinessText: Boolean(program?.stakeBusiness?.trim()),
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <main className="mx-auto max-w-[860px] bg-white px-6 py-6 text-black print:max-w-none print:px-4 print:py-3">
      <style>{`
        @media print {
          @page { size: Letter; margin: 10mm; }
          .no-print { display: none !important; }
          .print-tight * { line-height: 1.15; }
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
      `}</style>
      <div className="no-print mb-4 flex items-center justify-end">
        <PrintButton label={t(lang, "Print / Save PDF", "Imprimir / Guardar PDF")} />
      </div>

      <section className="print-tight space-y-4 text-[15px]">
        <h1 className="text-center text-[22px] font-semibold uppercase tracking-wide">{printTitleLine1}</h1>
        <p className="-mt-3 text-center text-[15px] font-medium">{printTitleLine2}</p>
        <div className="space-y-1">
          <div>
            <span className="font-semibold">
              {t(lang, "Recognition of authorities", "Reconocimiento de las autoridades")}:
            </span>{" "}
            {program?.recognitionNote?.trim() || <FillLine minWidthClass="min-w-[460px]" />}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2">
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
          <div>
            <span className="font-semibold">{t(lang, "Announcements", "Anuncios")}:</span>
          </div>
          <FixedRowsTable
            rows={program?.announcements?.trim() ? [program.announcements.trim()] : [""]}
            showIndex
          />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <span className="font-semibold">{t(lang, "Opening Hymn", "Himno inicial")}:</span>{" "}
              {program?.openingHymn?.trim() || "________"}
            </div>
            <div>
              <span className="font-semibold">{t(lang, "Opening Prayer", "Primera oración")}:</span>{" "}
              {memberNameById.get(meeting?.opening_prayer_member_id ?? "") ?? <FillLine minWidthClass="min-w-[240px]" />}
            </div>
          </div>
        </div>
        <PauseDivider lang={lang} />

        {(program?.wardBusinessSections ?? []).length > 0 ? (
          <div className="pt-1">
            <h2 className="text-[15px] font-semibold uppercase tracking-wide">{t(lang, "Ward Business", "Asuntos del barrio")}</h2>
            <div className="space-y-2">
              {(program?.wardBusinessSections ?? []).map((sec, idx) => ({ sec, idx })).sort((a, b) => {
                const orderDelta = wardBusinessSectionDisplayOrder(a.sec) - wardBusinessSectionDisplayOrder(b.sec);
                if (orderDelta !== 0) return orderDelta;
                return a.idx - b.idx;
              }).map(({ sec }) => {
                const commonText =
                  sec.kind === "aaron_priesthood_ordination"
                    ? ""
                    : sectionTemplateText(sec.templateKey, state.sectionTemplates, lang) || sec.body || "";
                const deaconText = sectionTemplateText("ward.ordination.deacon", state.sectionTemplates, lang);
                const tpText = sectionTemplateText("ward.ordination.teacher_priest", state.sectionTemplates, lang);
                // #region agent log
                void fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
                  body: JSON.stringify({
                    sessionId: "812a29",
                    runId: "sacrament-ward-order-debug-1",
                    hypothesisId: "H12",
                    location: "print/page.tsx:wardSectionOrder",
                    message: "Rendering ward-business section in canonical order",
                    data: { sectionId: sec.id, kind: sec.kind, order: wardBusinessSectionDisplayOrder(sec) },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
                const newMembersRows =
                  sec.kind === "new_members"
                    ? (() => {
                        const names = (sec.newMembersNames ?? "").trim();
                        // #region agent log
                        void fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
                          body: JSON.stringify({
                            sessionId: "812a29",
                            runId: "sacrament-print-new-members-debug-1",
                            hypothesisId: "H11",
                            location: "print/page.tsx:newMembersRows",
                            message: "Built new-members PDF rows from section payload",
                            data: { sectionId: sec.id, hasNames: names.length > 0, names },
                            timestamp: Date.now(),
                          }),
                        }).catch(() => {});
                        // #endregion
                        return names ? [names] : [];
                      })()
                    : [];
                const releaseRows =
                  sec.kind === "releases"
                    ? (() => {
                        const byMember = new Map<string, string[]>();
                        const memberOrder: string[] = [];
                        for (const e of sec.releaseEntries ?? []) {
                          const mid = e.memberId ?? "";
                          const calling = callingById.get(e.callingPositionId) ?? "—";
                          if (!byMember.has(mid)) {
                            byMember.set(mid, []);
                            memberOrder.push(mid);
                          }
                          const list = byMember.get(mid)!;
                          if (!list.includes(calling)) list.push(calling);
                        }
                        const rows = memberOrder.map((mid) => {
                          const name = memberNameById.get(mid) ?? "—";
                          const callings = (byMember.get(mid) ?? []).join(" y ");
                          return `${name} - ${callings}`;
                        });
                        // #region agent log
                        void fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
                          body: JSON.stringify({
                            sessionId: "812a29",
                            runId: "sacrament-print-section-names-debug-1",
                            hypothesisId: "H10",
                            location: "print/page.tsx:releasesRows",
                            message: "Built releases PDF rows with merged calling names",
                            data: { sectionId: sec.id, rowCount: rows.length, sample: rows.slice(0, 3) },
                            timestamp: Date.now(),
                          }),
                        }).catch(() => {});
                        // #endregion
                        return rows;
                      })()
                    : [];
                return (
                  <div key={sec.id}>
                    <p className="font-semibold">{wardBusinessSectionDefaultTitle(sec.kind, lang)}</p>
                    {commonText ? <p className="whitespace-pre-wrap">{commonText}</p> : null}
                    {sec.kind === "releases" && releaseRows.length > 0 ? (
                      <FixedRowsTable rows={releaseRows} />
                    ) : null}
                    {sec.kind === "sustainings" && (sec.sustainingEntries ?? []).length > 0 ? (
                      <FixedRowsTable
                        rows={(() => {
                          const byMember = new Map<string, string[]>();
                          const memberOrder: string[] = [];
                          for (const e of sec.sustainingEntries ?? []) {
                            const mid = e.memberId ?? "";
                            const calling = callingById.get(e.callingPositionId) ?? "—";
                            if (!byMember.has(mid)) {
                              byMember.set(mid, []);
                              memberOrder.push(mid);
                            }
                            const list = byMember.get(mid)!;
                            if (!list.includes(calling)) list.push(calling);
                          }
                          return memberOrder.map((mid) => {
                            const name = memberNameById.get(mid) ?? "—";
                            const callings = (byMember.get(mid) ?? []).join(" y ");
                            return `${name} - ${callings}`;
                          });
                        })()}
                      />
                    ) : null}
                    {sec.kind === "new_members" && newMembersRows.length > 0 ? (
                      <FixedRowsTable rows={newMembersRows} />
                    ) : null}
                    {sec.kind === "aaron_priesthood_ordination" && (sec.ordinationEntries ?? []).length > 0 ? (
                      <div className="space-y-1">
                        {(sec.ordinationEntries ?? []).some((o) => o.office === "deacon") ? (
                          <>
                            <p className="whitespace-pre-wrap">{deaconText}</p>
                            <FixedRowsTable
                              rows={(sec.ordinationEntries ?? [])
                                .filter((o) => o.office === "deacon")
                                .map((o) => memberNameById.get(o.memberId) ?? "—")}
                            />
                          </>
                        ) : null}
                        {(sec.ordinationEntries ?? []).some((o) => o.office === "teacher" || o.office === "priest") ? (
                          <>
                            <p className="whitespace-pre-wrap">{tpText}</p>
                            <FixedRowsTable
                              rows={(sec.ordinationEntries ?? [])
                                .filter((o) => o.office === "teacher" || o.office === "priest")
                                .map(
                                  (o) =>
                                    `${memberNameById.get(o.memberId) ?? "—"} (${t(
                                      lang,
                                      o.office === "teacher" ? "Teacher" : "Priest",
                                      o.office === "teacher" ? "Maestro" : "Presbítero",
                                    )})`,
                                )}
                            />
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="pt-1">
          <h2 className="text-[15px] font-semibold uppercase tracking-wide">{t(lang, "Stake Business", "Asuntos de la estaca")}</h2>
          <p className="whitespace-pre-wrap pt-2">
            {program?.stakeBusiness?.trim() || <FillLine minWidthClass="min-w-[190px]" />}
          </p>
        </div>

        <div className="pt-1">
          <h2 className="text-[15px] font-semibold uppercase tracking-wide">
            {t(lang, "Sacrament Service", "Servicio sacramental")}
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 pt-2">
            <div>
              <span className="font-semibold">{t(lang, "Sacrament Hymn", "Himno sacramental")}:</span>{" "}
              {program?.sacramentHymn?.trim() || "________"}
            </div>
          </div>
          <PauseDivider lang={lang} />
          <div className="space-y-1">
            <div className="font-semibold">{t(lang, "Speakers", "Discursos")}</div>
            <FixedRowsTable
              rows={printableSpeakers.map(
                (s) => (memberNameById.get(s.member_id ?? "") ?? "—") + (s.topic ? ` - ${s.topic}` : ""),
              )}
            />
          </div>
        </div>
        <PauseDivider lang={lang} />

        <div className="pt-1">
          <h2 className="text-[15px] font-semibold uppercase tracking-wide">{t(lang, "Closing", "Cierre")}</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            <div>
              <span className="font-semibold">{t(lang, "Closing Hymn", "Último himno")}:</span>{" "}
              {program?.closingHymn?.trim() || "________"}
            </div>
            <div>
              <span className="font-semibold">{t(lang, "Closing Prayer", "Última oración")}:</span>{" "}
              {memberNameById.get(meeting?.closing_prayer_member_id ?? "") ?? <FillLine minWidthClass="min-w-[240px]" />}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

