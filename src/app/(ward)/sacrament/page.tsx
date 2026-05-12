import { SacramentClient } from "./SacramentClient";
import { PastProgramsFallback } from "./PastProgramsFallback";
import { PrefetchSacramentWeeks } from "./PrefetchSacramentWeeks";
import { SacramentPastPrograms } from "./SacramentPastPrograms";
import { loadSacramentPageState } from "./loadSacramentState";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import {
  formatLocalISODate,
  shiftCalendarWeek,
  startOfWeekSundayFromISO,
  upcomingSacramentSunday,
} from "@/lib/sacramentProgram";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export default async function SacramentPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; ward?: string; date?: string }>;
}) {
  const sp = await searchParams;

  const wardRoles = await fetchUserWardRoles();
  const wardsMap = new Map<string, string>();
  for (const r of wardRoles) {
    if (!wardsMap.has(r.ward_id)) {
      wardsMap.set(r.ward_id, r.wards?.name ?? "Ward");
    }
  }
  const wards = [...wardsMap.entries()].map(([id, name]) => ({ id, name }));

  const wardId =
    sp.ward && wardsMap.has(sp.ward) ? sp.ward : wards[0]?.id ?? null;

  if (!wardId) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-foreground/70">
        You are not assigned to a ward yet. Sacrament programs are ward-scoped.
      </div>
    );
  }

  const meetingDateRaw = sp.date?.trim();
  const rawIso =
    meetingDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(meetingDateRaw)
      ? meetingDateRaw
      : formatLocalISODate(upcomingSacramentSunday());
  const meetingDate = formatLocalISODate(startOfWeekSundayFromISO(rawIso));
  if (meetingDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(meetingDateRaw) && meetingDate !== meetingDateRaw) {
    const q = new URLSearchParams();
    if (sp.ward) q.set("ward", sp.ward);
    q.set("date", meetingDate);
    redirect(`/sacrament?${q.toString()}`);
  }

  if (sp.mode === "full") {
    const q = new URLSearchParams();
    q.set("ward", wardId);
    q.set("date", meetingDate);
    redirect(`/sacrament?${q.toString()}`);
  }

  const prevWeekIso = shiftCalendarWeek(meetingDate, -1);
  const nextWeekIso = shiftCalendarWeek(meetingDate, 1);

  const [initial, initialPrev, initialNext] = await Promise.all([
    loadSacramentPageState(wardId, meetingDate),
    loadSacramentPageState(wardId, prevWeekIso),
    loadSacramentPageState(wardId, nextWeekIso),
  ]);

  const sacramentHref = (date: string) => {
    const q = new URLSearchParams();
    q.set("ward", wardId);
    q.set("date", date);
    return `/sacrament?${q.toString()}`;
  };

  const prevSacramentUrl = sacramentHref(prevWeekIso);
  const nextSacramentUrl = sacramentHref(nextWeekIso);

  return (
    <>
      <PrefetchSacramentWeeks urls={[prevSacramentUrl, nextSacramentUrl]} />
      <SacramentClient
        wards={wards}
        wardId={wardId}
        meetingDate={meetingDate}
        initial={initial}
        adjacentWeeks={{
          prevIso: prevWeekIso,
          prev: initialPrev,
          nextIso: nextWeekIso,
          next: initialNext,
        }}
      />
      <Suspense fallback={<PastProgramsFallback />}>
        <SacramentPastPrograms wardId={wardId} />
      </Suspense>
    </>
  );
}
