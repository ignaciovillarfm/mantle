import { loadSacramentPageState } from "../loadSacramentState";
import { PrintButton } from "./PrintButton";
import { SacramentPrintDocument } from "./SacramentPrintDocument";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import {
  formatLocalISODate,
  formatSacramentMeetingDateLong,
  sacramentPrintDocumentTitle,
  startOfWeekSundayFromISO,
  upcomingSacramentSunday,
  type SacramentFormLang,
} from "@/lib/sacramentProgram";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  return { lang, wardId, wardName, meetingDate, meetingDateRaw, documentTitle };
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

export default async function SacramentPrintPage({
  searchParams,
}: {
  searchParams: Promise<PrintSearchParams>;
}) {
  const sp = await searchParams;
  const { lang, wardId, wardName, meetingDate, meetingDateRaw, documentTitle } =
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
  const memberNameById = new Map((state.members ?? []).map((m) => [m.id, m.name]));
  const callingById = new Map(
    (state.callingPositions ?? []).map((p) => [p.id, lang === "es" ? p.titleEs : p.titleEn]),
  );

  return (
    <SacramentPrintDocument
      lang={lang}
      wardName={wardName}
      meetingDate={meetingDate}
      documentTitle={documentTitle}
      program={meeting?.program}
      meeting={meeting}
      speakers={state.speakers ?? []}
      memberNameById={memberNameById}
      callingById={callingById}
      sectionTemplates={state.sectionTemplates}
      actions={
        <PrintButton
          label={t(lang, "Print / Save PDF", "Imprimir / Guardar PDF")}
          documentTitle={documentTitle}
        />
      }
    />
  );
}
