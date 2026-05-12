"use client";

import { AddWardBusinessSectionModal } from "./AddWardBusinessSectionModal";
import type { ApplyPreviousDraft } from "./applyPreviousWeekDraft";
import type { SacramentPageBundle } from "./loadSacramentState";
import {
  DEFAULT_SACRAMENT_PROGRAM,
  defaultTemplateKeyForWardKind,
  formatLocalISODate,
  MAX_DISCOURSE_SLOTS,
  MAX_WARD_BUSINESS_SECTIONS,
  MIN_DISCOURSE_SLOTS,
  normalizeSpeakerSlots,
  parseTalkResponseStatus,
  sacramentSundayLongLabel,
  shiftCalendarWeek,
  startOfWeekSundayFromISO,
  wardBusinessSectionDisplayOrder,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
  type SacramentProgramBody,
  type SpeakerSlot,
  type TalkResponseStatus,
  type WardBusinessSectionKind,
} from "@/lib/sacramentProgram";
import { loadSacramentPageQuery } from "@/lib/sacrament/fetchSacramentPageJson";
import { mergeSacramentBundleAfterSave } from "@/lib/sacrament/mergeSacramentBundleAfterSave";
import { SACRAMENT_PAGE_STALE_MS, sacramentQueryKeys } from "@/lib/sacrament/sacramentQueryKeys";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const SACRAMENT_LANG_STORAGE_KEY = "mantle-sacrament-form-lang";
const AUTO_SAVE_DEBOUNCE_MS = 1600;

/** Single-line row height matching selects; extra right inset for native dropdown chevron */
const SACRAMENT_SELECT_ROW_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-sm leading-10 text-foreground disabled:opacity-50";
/** Short notes beside assignment dropdowns — same visual height as selects */
const SACRAMENT_ASSIGNMENT_NOTE_CLASS =
  "mt-1 box-border h-10 min-h-10 w-full resize-none overflow-x-auto whitespace-nowrap rounded-lg border border-border bg-background px-3 py-0 text-sm leading-10 text-foreground outline-none disabled:opacity-50";

function serializeSacramentDraft(input: {
  program: SacramentProgramBody;
  presiding: string | null;
  conducting: string | null;
  chorister: string | null;
  organist: string | null;
  openingPrayer: string | null;
  closingPrayer: string | null;
  openingPrayerResponse: TalkResponseStatus;
  openingPrayerNote: string | null;
  openingPrayerFulfilled: boolean | null;
  closingPrayerResponse: TalkResponseStatus;
  closingPrayerNote: string | null;
  closingPrayerFulfilled: boolean | null;
  speakers: SpeakerSlot[];
}): string {
  const theme = input.program.preparationTheme.trim() || null;
  return JSON.stringify({
    theme,
    program: input.program,
    presiding_member_id: input.presiding,
    conducting_id: input.conducting,
    chorister_member_id: input.chorister,
    organist_member_id: input.organist,
    opening_prayer_member_id: input.openingPrayer,
    closing_prayer_member_id: input.closingPrayer,
    opening_prayer_response_status: input.openingPrayerResponse,
    opening_prayer_response_note: input.openingPrayerNote,
    opening_prayer_fulfilled: input.openingPrayerFulfilled,
    closing_prayer_response_status: input.closingPrayerResponse,
    closing_prayer_response_note: input.closingPrayerNote,
    closing_prayer_fulfilled: input.closingPrayerFulfilled,
    speakers: normalizeSpeakerSlots(input.speakers),
  });
}

function snapshotFromBundle(bundle: SacramentPageBundle): string {
  const m = bundle.meeting;
  const program = m?.program ? { ...m.program } : { ...DEFAULT_SACRAMENT_PROGRAM };
  return serializeSacramentDraft({
    program,
    presiding: m?.presiding_member_id ?? null,
    conducting: m?.conducting_id ?? null,
    chorister: m?.chorister_member_id ?? null,
    organist: m?.organist_member_id ?? null,
    openingPrayer: m?.opening_prayer_member_id ?? null,
    closingPrayer: m?.closing_prayer_member_id ?? null,
    openingPrayerResponse: parseTalkResponseStatus(m?.opening_prayer_response_status),
    openingPrayerNote: m?.opening_prayer_response_note ?? null,
    openingPrayerFulfilled: m?.opening_prayer_fulfilled ?? null,
    closingPrayerResponse: parseTalkResponseStatus(m?.closing_prayer_response_status),
    closingPrayerNote: m?.closing_prayer_response_note ?? null,
    closingPrayerFulfilled: m?.closing_prayer_fulfilled ?? null,
    speakers: normalizeSpeakerSlots(bundle.speakers as SpeakerSlot[]),
  });
}

function formT(lang: SacramentFormLang, b: { en: string; es: string }): string {
  return lang === "es" ? b.es : b.en;
}

/** Sacrament programs use Sunday only; arrows link to the previous/next Sunday (URLs built on the server). */
function SacramentSundayStrip({
  displayLongLabel,
  prevSacramentUrl,
  nextSacramentUrl,
  onPrevClick,
  onNextClick,
  lang,
}: {
  displayLongLabel: string;
  prevSacramentUrl: string;
  nextSacramentUrl: string;
  onPrevClick: () => void;
  onNextClick: () => void;
  lang: SacramentFormLang;
}) {
  const prevAria = formT(lang, { en: "Previous Sunday", es: "Domingo anterior" });
  const nextAria = formT(lang, { en: "Next Sunday", es: "Domingo siguiente" });
  const formattedLongLabel =
    displayLongLabel.length > 0
      ? displayLongLabel.charAt(0).toUpperCase() + displayLongLabel.slice(1)
      : displayLongLabel;
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "sacrament-sunday-strip-debug-1",
      hypothesisId: "H2",
      location: "SacramentClient.tsx:SacramentSundayStrip",
      message: "Computed Sunday strip labels",
      data: {
        lang,
        inputDisplayLongLabel: displayLongLabel,
        outputDisplayLongLabel: formattedLongLabel,
        showWeekdayCaption: false,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <div className="w-full min-w-0 rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          href={prevSacramentUrl}
          aria-label={prevAria}
          className="flex h-14 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-lg leading-none text-foreground hover:bg-surface-hover sm:h-16 sm:w-10"
          onClick={onPrevClick}
        >
          ‹
        </Link>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">{formattedLongLabel}</p>
        </div>
        <Link
          href={nextSacramentUrl}
          aria-label={nextAria}
          className="flex h-14 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-lg leading-none text-foreground hover:bg-surface-hover sm:h-16 sm:w-10"
          onClick={onNextClick}
        >
          ›
        </Link>
      </div>
    </div>
  );
}

function FieldLabel({
  en,
  es,
  lang,
}: {
  en: string;
  es: string;
  lang: SacramentFormLang;
}) {
  return <span className="mb-1 block font-medium text-foreground">{formT(lang, { en, es })}</span>;
}

function ReadonlyPairRow({
  leftLabel,
  rightLabel,
  leftValue,
  rightValue,
  showLabels = true,
}: {
  leftLabel: string;
  rightLabel: string;
  leftValue: string;
  rightValue: string;
  showLabels?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        {showLabels ? <p className="mb-1 text-sm font-medium text-foreground">{leftLabel}</p> : null}
        <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          {leftValue || "—"}
        </div>
      </div>
      <div>
        {showLabels ? <p className="mb-1 text-sm font-medium text-foreground">{rightLabel}</p> : null}
        <div className="flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm text-foreground">
          {rightValue || "—"}
        </div>
      </div>
    </div>
  );
}

function MemberSelect({
  id,
  value,
  onChange,
  members,
  disabled,
}: {
  id: string;
  value: string | null;
  onChange: (v: string | null) => void;
  members: { id: string; name: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      disabled={disabled}
      className={SACRAMENT_SELECT_ROW_CLASS}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
    >
      <option value="">—</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}

function parseHymnValue(value: string): { numberPart: string; namePart: string } {
  const raw = value ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return { numberPart: "", namePart: "" };
  const match = raw.match(/^(\d+)\s*[-:]\s*(.*)$/);
  if (match) {
    return { numberPart: match[1]?.trim() ?? "", namePart: match[2] ?? "" };
  }
  if (/^\d+$/.test(trimmed)) {
    return { numberPart: trimmed, namePart: "" };
  }
  return { numberPart: "", namePart: raw };
}

function buildHymnValue(numberPart: string, namePart: string): string {
  const n = numberPart.trim();
  const name = namePart;
  if (n && name.length > 0) return `${n} - ${name}`;
  if (n) return n;
  return name;
}

function HymnInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const parsed = parseHymnValue(value);
  return (
    <div className="mt-1 flex items-center gap-2">
      <span aria-hidden="true" className="shrink-0 text-sm font-medium text-foreground/65" title="Hymn number">
        #
      </span>
      <input
        id={`${id}-number`}
        type="text"
        inputMode="numeric"
        className="h-10 w-16 shrink-0 rounded-lg border border-border bg-background px-2 text-center text-sm"
        aria-label="Hymn number"
        value={parsed.numberPart}
        onChange={(e) => onChange(buildHymnValue(e.target.value, parsed.namePart))}
      />
      <input
        id={id}
        type="text"
        className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
        placeholder={placeholder}
        value={parsed.namePart}
        onChange={(e) => onChange(buildHymnValue(parsed.numberPart, e.target.value))}
      />
    </div>
  );
}

function renumberSpeakerSlots(list: SpeakerSlot[]): SpeakerSlot[] {
  return list.map((s, i) => ({ ...s, position: i + 1 }));
}

/** Shown on SSR + first client paint so password managers (e.g. Dashlane) cannot inject attributes before hydration. */
function SacramentFormSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading form">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="h-6 max-w-xs animate-pulse rounded bg-foreground/10" />
          <div className="mt-4 space-y-3">
            <div className="h-24 w-full animate-pulse rounded-lg bg-foreground/5" />
            <div className="h-24 w-full animate-pulse rounded-lg bg-foreground/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SacramentClient({
  wards,
  wardId,
  meetingDate,
  initial,
  adjacentWeeks,
}: {
  wards: { id: string; name: string }[];
  wardId: string;
  meetingDate: string;
  initial: SacramentPageBundle;
  /** Same shape as `/api/sacrament/state` — hydrates React Query so week arrows do not re-hit the JSON route. */
  adjacentWeeks: {
    prevIso: string;
    prev: SacramentPageBundle;
    nextIso: string;
    next: SacramentPageBundle;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const urlWardRaw = searchParams.get("ward")?.trim() ?? "";
  const effectiveWardId = wards.some((w) => w.id === urlWardRaw) ? urlWardRaw : wardId;
  const urlDateRaw = searchParams.get("date")?.trim() ?? "";
  const effectiveMeetingDate = useMemo(() => {
    if (urlDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(urlDateRaw)) {
      return formatLocalISODate(startOfWeekSundayFromISO(urlDateRaw));
    }
    return meetingDate;
  }, [urlDateRaw, meetingDate]);

  const prevWeekFromUrl = useMemo(() => shiftCalendarWeek(effectiveMeetingDate, -1), [effectiveMeetingDate]);
  const nextWeekFromUrl = useMemo(() => shiftCalendarWeek(effectiveMeetingDate, 1), [effectiveMeetingDate]);

  const sacramentHref = useCallback(
    (date: string) => {
      const q = new URLSearchParams();
      q.set("ward", effectiveWardId);
      q.set("date", date);
      return `/sacrament?${q.toString()}`;
    },
    [effectiveWardId],
  );

  const prevSacramentUrlLive = useMemo(() => sacramentHref(prevWeekFromUrl), [prevWeekFromUrl, sacramentHref]);
  const nextSacramentUrlLive = useMemo(() => sacramentHref(nextWeekFromUrl), [nextWeekFromUrl, sacramentHref]);
  const wardDisplayName = useMemo(() => {
    const w = wards.find((x) => x.id === effectiveWardId);
    return w?.name ?? "—";
  }, [wards, effectiveWardId]);

  const pageQueryKey = useMemo(
    () => sacramentQueryKeys.page(effectiveWardId, effectiveMeetingDate),
    [effectiveWardId, effectiveMeetingDate],
  );
  const routeKey = `${effectiveWardId}|${effectiveMeetingDate}`;
  const propsAlignedWithUrl =
    meetingDate === effectiveMeetingDate && wardId === effectiveWardId;
  const routeSeedRef = useRef<string | null>(null);
  if (routeSeedRef.current !== routeKey) {
    routeSeedRef.current = routeKey;
    const cached = queryClient.getQueryData<SacramentPageBundle>(pageQueryKey);
    if (!cached && propsAlignedWithUrl) {
      queryClient.setQueryData(pageQueryKey, initial);
    }
  }

  const cacheSnapshot = queryClient.getQueryData<SacramentPageBundle>(pageQueryKey);
  const { data: queryBundle } = useQuery({
    queryKey: pageQueryKey,
    queryFn: (ctx) => loadSacramentPageQuery(queryClient, ctx),
    /** Seeds SSR / empty cache; ignored when prefetch filled the key — render-phase + layout sync fix that. */
    initialData: propsAlignedWithUrl ? initial : undefined,
    placeholderData: cacheSnapshot,
    staleTime: SACRAMENT_PAGE_STALE_MS,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
  /** Never fall back to `initial` when URL is ahead of RSC props — that was the previous week and made the strip jump before the form. */
  const bundle: SacramentPageBundle | undefined =
    queryBundle ?? cacheSnapshot ?? (propsAlignedWithUrl ? initial : undefined);

  /** Optimistic week for the date strip only — updates on arrow click before RSC returns (~see debug H5). */
  const [displayWeekIso, setDisplayWeekIso] = useState(meetingDate);
  const [program, setProgram] = useState<SacramentProgramBody>(DEFAULT_SACRAMENT_PROGRAM);
  const [presiding, setPresiding] = useState<string | null>(null);
  const [conducting, setConducting] = useState<string | null>(null);
  const [chorister, setChorister] = useState<string | null>(null);
  const [organist, setOrganist] = useState<string | null>(null);
  const [openingPrayer, setOpeningPrayer] = useState<string | null>(null);
  const [closingPrayer, setClosingPrayer] = useState<string | null>(null);
  const [openingPrayerResponse, setOpeningPrayerResponse] = useState<TalkResponseStatus>("pending");
  const [openingPrayerNote, setOpeningPrayerNote] = useState<string | null>(null);
  const [openingPrayerFulfilled, setOpeningPrayerFulfilled] = useState<boolean | null>(null);
  const [closingPrayerResponse, setClosingPrayerResponse] = useState<TalkResponseStatus>("pending");
  const [closingPrayerNote, setClosingPrayerNote] = useState<string | null>(null);
  const [closingPrayerFulfilled, setClosingPrayerFulfilled] = useState<boolean | null>(null);
  const [speakers, setSpeakers] = useState<SpeakerSlot[]>(normalizeSpeakerSlots([]));
  const displaySpeakers = useMemo(() => normalizeSpeakerSlots(speakers), [speakers]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formLang, setFormLangState] = useState<SacramentFormLang>("es");
  const [applyBusy, setApplyBusy] = useState(false);
  const [wardAddModalOpen, setWardAddModalOpen] = useState(false);
  const [wardEditSectionId, setWardEditSectionId] = useState<string | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const lastSavedRef = useRef<string>("");
  const localDraftRef = useRef<string>("");
  const routeKeyRef = useRef<string | null>(null);
  const didHydrateCurrentRouteRef = useRef(false);
  const [formFieldsMounted, setFormFieldsMounted] = useState(false);

  useEffect(() => {
    setFormFieldsMounted(true);
  }, []);

  /** Same ward/date after `router.refresh()`: RSC passes a new `initial` — publish it so cache matches server without waiting on refetch. */
  useLayoutEffect(() => {
    if (!propsAlignedWithUrl) return;
    queryClient.setQueryData(pageQueryKey, initial);
  }, [initial, pageQueryKey, queryClient, propsAlignedWithUrl]);

  /** SSR loaded prev/next via Supabase; `router.prefetch` only warms RSC — this seeds TanStack so `/api/sacrament/state` is not called for those keys. */
  useLayoutEffect(() => {
    if (!propsAlignedWithUrl) return;
    queryClient.setQueryData(sacramentQueryKeys.page(wardId, adjacentWeeks.prevIso), adjacentWeeks.prev);
    queryClient.setQueryData(sacramentQueryKeys.page(wardId, adjacentWeeks.nextIso), adjacentWeeks.next);
  }, [adjacentWeeks, queryClient, wardId, propsAlignedWithUrl]);

  useEffect(() => {
    for (const iso of [prevWeekFromUrl, nextWeekFromUrl]) {
      void queryClient.prefetchQuery({
        queryKey: sacramentQueryKeys.page(effectiveWardId, iso),
        queryFn: (ctx) => loadSacramentPageQuery(queryClient, ctx),
        staleTime: SACRAMENT_PAGE_STALE_MS,
        gcTime: 30 * 60 * 1000,
      });
    }
  }, [queryClient, effectiveWardId, prevWeekFromUrl, nextWeekFromUrl]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SACRAMENT_LANG_STORAGE_KEY);
      if (raw === "en" || raw === "es") setFormLangState(raw);
    } catch {
      /* ignore */
    }
  }, []);

  const setFormLang = useCallback((lang: SacramentFormLang) => {
    setFormLangState(lang);
    try {
      localStorage.setItem(SACRAMENT_LANG_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setDisplayWeekIso(effectiveMeetingDate);
  }, [effectiveMeetingDate]);

  const handlePrevWeekClick = useCallback(() => {
    setDisplayWeekIso(prevWeekFromUrl);
  }, [prevWeekFromUrl]);

  const handleNextWeekClick = useCallback(() => {
    setDisplayWeekIso(nextWeekFromUrl);
  }, [nextWeekFromUrl]);

  useEffect(() => {
    localDraftRef.current = serializeSacramentDraft({
      program,
      presiding,
      conducting,
      chorister,
      organist,
      openingPrayer,
      closingPrayer,
      openingPrayerResponse,
      openingPrayerNote,
      openingPrayerFulfilled,
      closingPrayerResponse,
      closingPrayerNote,
      closingPrayerFulfilled,
      speakers,
    });
  }, [
    program,
    presiding,
    conducting,
    chorister,
    organist,
    openingPrayer,
    closingPrayer,
    openingPrayerResponse,
    openingPrayerNote,
    openingPrayerFulfilled,
    closingPrayerResponse,
    closingPrayerNote,
    closingPrayerFulfilled,
    speakers,
  ]);

  useEffect(() => {
    if (!bundle) return;
    const rk = `${effectiveWardId}|${effectiveMeetingDate}`;
    const navigated = routeKeyRef.current !== null && routeKeyRef.current !== rk;
    if (navigated) {
      didHydrateCurrentRouteRef.current = false;
    }
    routeKeyRef.current = rk;
    const hasLocalUnsavedChanges = localDraftRef.current !== lastSavedRef.current;
    if (didHydrateCurrentRouteRef.current && !navigated && hasLocalUnsavedChanges) return;

    const m = bundle.meeting;
    if (m) {
      setProgram(m.program);
      setPresiding(m.presiding_member_id);
      setConducting(m.conducting_id);
      setChorister(m.chorister_member_id);
      setOrganist(m.organist_member_id);
      setOpeningPrayer(m.opening_prayer_member_id);
      setClosingPrayer(m.closing_prayer_member_id);
      setOpeningPrayerResponse(parseTalkResponseStatus(m.opening_prayer_response_status));
      setOpeningPrayerNote(m.opening_prayer_response_note ?? null);
      setOpeningPrayerFulfilled(m.opening_prayer_fulfilled ?? null);
      setClosingPrayerResponse(parseTalkResponseStatus(m.closing_prayer_response_status));
      setClosingPrayerNote(m.closing_prayer_response_note ?? null);
      setClosingPrayerFulfilled(m.closing_prayer_fulfilled ?? null);
    } else {
      setProgram({ ...DEFAULT_SACRAMENT_PROGRAM });
      setPresiding(null);
      setConducting(null);
      setChorister(null);
      setOrganist(null);
      setOpeningPrayer(null);
      setClosingPrayer(null);
      setOpeningPrayerResponse("pending");
      setOpeningPrayerNote(null);
      setOpeningPrayerFulfilled(null);
      setClosingPrayerResponse("pending");
      setClosingPrayerNote(null);
      setClosingPrayerFulfilled(null);
    }
    setSpeakers(normalizeSpeakerSlots(bundle.speakers));
    if (navigated) {
      setSaveMsg(null);
      setSaveSuccess(false);
    }
    lastSavedRef.current = snapshotFromBundle(bundle);
    didHydrateCurrentRouteRef.current = true;
    setAutosaveReady(false);
    const id = window.setTimeout(() => setAutosaveReady(true), 0);
    return () => clearTimeout(id);
  }, [bundle, effectiveMeetingDate, effectiveWardId]);

  useEffect(() => {
    if (!autosaveReady || !bundle) return;

    const current = serializeSacramentDraft({
      program,
      presiding,
      conducting,
      chorister,
      organist,
      openingPrayer,
      closingPrayer,
      openingPrayerResponse,
      openingPrayerNote,
      openingPrayerFulfilled,
      closingPrayerResponse,
      closingPrayerNote,
      closingPrayerFulfilled,
      speakers,
    });
    if (current === lastSavedRef.current) return;

    const t = window.setTimeout(() => {
      const next = serializeSacramentDraft({
        program,
        presiding,
        conducting,
        chorister,
        organist,
        openingPrayer,
        closingPrayer,
        openingPrayerResponse,
        openingPrayerNote,
        openingPrayerFulfilled,
        closingPrayerResponse,
        closingPrayerNote,
        closingPrayerFulfilled,
        speakers,
      });
      if (next === lastSavedRef.current) return;

      setSaving(true);
      setSaveMsg(null);
      setSaveSuccess(false);

      void (async () => {
        const programForSave: SacramentProgramBody = {
          ...program,
          wardBusinessSections: (program.wardBusinessSections ?? []).map((s) => {
            const templateKey = defaultTemplateKeyForWardKind(s.kind);
            if (templateKey) {
              return { ...s, templateKey, body: "" };
            }
            return s;
          }),
        };
        const payload = {
          wardId: effectiveWardId,
          date: effectiveMeetingDate,
          theme: programForSave.preparationTheme.trim() || null,
          program: programForSave,
          presiding_member_id: presiding,
          conducting_id: conducting,
          chorister_member_id: chorister,
          organist_member_id: organist,
          opening_prayer_member_id: openingPrayer,
          closing_prayer_member_id: closingPrayer,
          opening_prayer_response_status: openingPrayerResponse,
          opening_prayer_response_note: openingPrayerNote,
          opening_prayer_fulfilled: openingPrayerFulfilled,
          closing_prayer_response_status: closingPrayerResponse,
          closing_prayer_response_note: closingPrayerNote,
          closing_prayer_fulfilled: closingPrayerFulfilled,
          speakers: normalizeSpeakerSlots(speakers),
        };
        // #region agent log
        fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
          body: JSON.stringify({
            sessionId: "812a29",
            runId: "ward-business-storage-normalization-debug-1",
            hypothesisId: "H3",
            location: "SacramentClient.tsx:autosavePayload",
            message: "Normalized section bodies before save",
            data: {
              sectionKinds: programForSave.wardBusinessSections.map((s) => s.kind),
              nonEmptyBodies: programForSave.wardBusinessSections.map((s) => ({
                kind: s.kind,
                hasBody: s.body.trim().length > 0,
              })),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        const http = await fetch("/api/sacrament/program", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const res = (await http.json()) as
          | { ok: true; meetingId: string }
          | { ok: false; error: string };
        setSaving(false);
        if (http.ok && res.ok) {
          lastSavedRef.current = next;
          setSaveSuccess(true);
          const prevBundle =
            queryClient.getQueryData<SacramentPageBundle>(pageQueryKey) ?? bundle;
          queryClient.setQueryData(
            pageQueryKey,
            mergeSacramentBundleAfterSave(prevBundle, {
              meetingId: res.meetingId,
              date: effectiveMeetingDate,
              theme: payload.theme,
              program: payload.program,
              presiding_member_id: payload.presiding_member_id,
              conducting_id: payload.conducting_id,
              chorister_member_id: payload.chorister_member_id,
              organist_member_id: payload.organist_member_id,
              opening_prayer_member_id: payload.opening_prayer_member_id,
              closing_prayer_member_id: payload.closing_prayer_member_id,
              opening_prayer_response_status: payload.opening_prayer_response_status,
              opening_prayer_response_note: payload.opening_prayer_response_note,
              opening_prayer_fulfilled: payload.opening_prayer_fulfilled,
              closing_prayer_response_status: payload.closing_prayer_response_status,
              closing_prayer_response_note: payload.closing_prayer_response_note,
              closing_prayer_fulfilled: payload.closing_prayer_fulfilled,
              speakers: payload.speakers,
            }),
          );
          router.refresh();
        } else {
          let msg = `Save failed (${http.status})`;
          if (typeof res === "object" && res !== null && "error" in res && typeof (res as { error: unknown }).error === "string") {
            msg = (res as { error: string }).error;
          }
          setSaveMsg(msg);
        }
      })();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [
    autosaveReady,
    program,
    presiding,
    conducting,
    chorister,
    organist,
    openingPrayer,
    closingPrayer,
    openingPrayerResponse,
    openingPrayerNote,
    openingPrayerFulfilled,
    closingPrayerResponse,
    closingPrayerNote,
    closingPrayerFulfilled,
    speakers,
    effectiveWardId,
    effectiveMeetingDate,
    pageQueryKey,
    bundle,
    queryClient,
    router,
  ]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "sacrament-hymn-ui-debug-1",
        hypothesisId: "H1",
        location: "SacramentClient.tsx:hymnFields",
        message: "Rendered hymn fields with split number/name UI",
        data: {
          openingHymn: program.openingHymn,
          sacramentHymn: program.sacramentHymn,
          closingHymn: program.closingHymn,
          preparationTheme: program.preparationTheme,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [program.openingHymn, program.sacramentHymn, program.closingHymn, program.preparationTheme]);

  const applyPreviousWeek = useCallback(async () => {
    setApplyBusy(true);
    setSaveMsg(null);
    setSaveSuccess(false);
    try {
      const http = await fetch("/api/sacrament/apply-previous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ wardId: effectiveWardId, forMeetingDate: effectiveMeetingDate }),
      });
      const res = (await http.json()) as
        | { ok: true; draft: ApplyPreviousDraft }
        | { ok: false; error: string };
      if (!http.ok || !res.ok) {
        let msg = `Request failed (${http.status})`;
        if (typeof res === "object" && res !== null && "error" in res && typeof (res as { error: unknown }).error === "string") {
          msg = (res as { error: string }).error;
        }
        setSaveMsg(msg);
        return;
      }
      const d = res.draft;
      setProgram(d.program);
      setPresiding(d.presiding_member_id);
      setConducting(d.conducting_id);
      setChorister(d.chorister_member_id);
      setOrganist(d.organist_member_id);
      setOpeningPrayer(d.opening_prayer_member_id);
      setClosingPrayer(d.closing_prayer_member_id);
      setOpeningPrayerResponse("pending");
      setOpeningPrayerNote(null);
      setOpeningPrayerFulfilled(null);
      setClosingPrayerResponse("pending");
      setClosingPrayerNote(null);
      setClosingPrayerFulfilled(null);
      setSpeakers(d.speakers);
    } finally {
      setApplyBusy(false);
    }
  }, [effectiveWardId, effectiveMeetingDate]);

  const navigateWardDate = (nextWard: string, nextDate: string) => {
    const q = new URLSearchParams();
    q.set("ward", nextWard);
    q.set("date", nextDate);
    router.push(`/sacrament?${q.toString()}`);
  };

  const updateProgram = (key: keyof SacramentProgramBody, value: string) => {
    setProgram((p) => ({ ...p, [key]: value }));
  };

  const appendWardBusinessSection = useCallback(
    (section: {
      kind: WardBusinessSectionKind;
      title: string;
      body: string;
      templateKey?: string;
      newMembersNames?: string;
      sustainingEntries?: { memberId: string; callingPositionId: string }[];
      releaseEntries?: { memberId: string; callingPositionId: string }[];
      ordinationEntries?: { memberId: string; office: "deacon" | "teacher" | "priest" | "" }[];
    }) => {
      setProgram((p) => {
        const cur = p.wardBusinessSections ?? [];
        const id =
          typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID
            ? globalThis.crypto.randomUUID()
            : `wb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const sustainingEntries = (section.sustainingEntries ?? [])
          .map((e) => ({
            memberId: e.memberId?.trim() ?? "",
            callingPositionId: e.callingPositionId?.trim() ?? "",
          }))
          .filter((e) => e.memberId && e.callingPositionId);
        const sustaining = section.kind === "sustainings" && sustainingEntries.length > 0 ? { sustainingEntries } : {};
        const releaseEntries = (section.releaseEntries ?? [])
          .map((e) => ({
            memberId: e.memberId?.trim() ?? "",
            callingPositionId: e.callingPositionId?.trim() ?? "",
          }))
          .filter((e) => e.memberId && e.callingPositionId);
        const releases = section.kind === "releases" && releaseEntries.length > 0 ? { releaseEntries } : {};
        const ordinationEntries = (section.ordinationEntries ?? [])
          .map((e) => ({ memberId: e.memberId?.trim() ?? "", office: e.office }))
          .filter((e) => e.memberId && e.office);
        const ordinations =
          section.kind === "aaron_priesthood_ordination" && ordinationEntries.length > 0
            ? { ordinationEntries }
            : {};
        if (section.kind === "releases") {
          const existingIdx = cur.findIndex((s) => s.kind === "releases");
          if (existingIdx >= 0) {
            const existing = cur[existingIdx];
            const mergedReleases = [
              ...(existing.releaseEntries ?? []),
              ...(releaseEntries as { memberId: string; callingPositionId: string }[]),
            ].filter((entry, idx, arr) => {
              const key = `${entry.memberId}::${entry.callingPositionId}`;
              return arr.findIndex((e) => `${e.memberId}::${e.callingPositionId}` === key) === idx;
            });
            const nextSections = [...cur];
            nextSections[existingIdx] = {
              ...existing,
              releaseEntries: mergedReleases,
            };
            return {
              ...p,
              wardBusiness: "",
              releases: "",
              sustainings: "",
              wardBusinessSections: nextSections,
            };
          }
        }
        if (section.kind === "sustainings") {
          const existingIdx = cur.findIndex((s) => s.kind === "sustainings");
          if (existingIdx >= 0) {
            const existing = cur[existingIdx];
            const mergedSustainings = [
              ...(existing.sustainingEntries ?? []),
              ...(sustainingEntries as { memberId: string; callingPositionId: string }[]),
            ].filter((entry, idx, arr) => {
              const key = `${entry.memberId}::${entry.callingPositionId}`;
              return arr.findIndex((e) => `${e.memberId}::${e.callingPositionId}` === key) === idx;
            });
            const nextSections = [...cur];
            nextSections[existingIdx] = {
              ...existing,
              sustainingEntries: mergedSustainings,
            };
            return {
              ...p,
              wardBusiness: "",
              releases: "",
              sustainings: "",
              wardBusinessSections: nextSections,
            };
          }
        }
        if (section.kind === "aaron_priesthood_ordination") {
          const existingIdx = cur.findIndex((s) => s.kind === "aaron_priesthood_ordination");
          if (existingIdx >= 0) {
            const existing = cur[existingIdx];
            const mergedOrdinations = [
              ...(existing.ordinationEntries ?? []),
              ...(ordinationEntries as { memberId: string; office: "deacon" | "teacher" | "priest" }[]),
            ].filter((entry, idx, arr) => {
              const key = `${entry.memberId}::${entry.office}`;
              return arr.findIndex((e) => `${e.memberId}::${e.office}` === key) === idx;
            });
            const nextSections = [...cur];
            nextSections[existingIdx] = {
              ...existing,
              ordinationEntries: mergedOrdinations,
            };
            return {
              ...p,
              wardBusiness: "",
              releases: "",
              sustainings: "",
              wardBusinessSections: nextSections,
            };
          }
        }
        if (cur.length >= MAX_WARD_BUSINESS_SECTIONS) return p;
        return {
          ...p,
          wardBusiness: "",
          releases: "",
          sustainings: "",
          wardBusinessSections: [
            ...cur,
            {
              id,
              kind: section.kind,
              title: section.title,
              body: section.body,
              templateKey: section.templateKey ?? defaultTemplateKeyForWardKind(section.kind) ?? undefined,
              ...(section.kind === "new_members" ? { newMembersNames: section.newMembersNames ?? "" } : {}),
              ...sustaining,
              ...releases,
              ...ordinations,
            },
          ],
        };
      });
    },
    [],
  );

  const removeWardBusinessSection = useCallback((id: string) => {
    setProgram((p) => ({
      ...p,
      wardBusinessSections: (p.wardBusinessSections ?? []).filter((s) => s.id !== id),
    }));
  }, []);
  const updateWardBusinessSection = useCallback(
    (
      sectionId: string,
      section: {
        kind: WardBusinessSectionKind;
        title: string;
        body: string;
        templateKey?: string;
        newMembersNames?: string;
        sustainingEntries?: { memberId: string; callingPositionId: string }[];
        releaseEntries?: { memberId: string; callingPositionId: string }[];
        ordinationEntries?: { memberId: string; office: "deacon" | "teacher" | "priest" | "" }[];
      },
    ) => {
      setProgram((p) => {
        const cur = p.wardBusinessSections ?? [];
        const idx = cur.findIndex((s) => s.id === sectionId);
        if (idx < 0) return p;
        const sustainingEntries = (section.sustainingEntries ?? [])
          .map((e) => ({
            memberId: e.memberId?.trim() ?? "",
            callingPositionId: e.callingPositionId?.trim() ?? "",
          }))
          .filter((e) => e.memberId && e.callingPositionId);
        const releaseEntries = (section.releaseEntries ?? [])
          .map((e) => ({
            memberId: e.memberId?.trim() ?? "",
            callingPositionId: e.callingPositionId?.trim() ?? "",
          }))
          .filter((e) => e.memberId && e.callingPositionId);
        const ordinationEntries = (section.ordinationEntries ?? [])
          .map((e) => ({ memberId: e.memberId?.trim() ?? "", office: e.office }))
          .filter((e) => e.memberId && e.office);
        const nextSection: SacramentProgramBody["wardBusinessSections"][number] = {
          id: sectionId,
          kind: section.kind,
          title: section.title,
          body: section.body,
          templateKey: section.templateKey ?? defaultTemplateKeyForWardKind(section.kind) ?? undefined,
          ...(section.kind === "new_members" ? { newMembersNames: section.newMembersNames ?? "" } : {}),
          ...(section.kind === "sustainings" && sustainingEntries.length > 0 ? { sustainingEntries } : {}),
          ...(section.kind === "releases" && releaseEntries.length > 0 ? { releaseEntries } : {}),
          ...(section.kind === "aaron_priesthood_ordination" && ordinationEntries.length > 0
            ? { ordinationEntries }
            : {}),
        };
        const nextSections = [...cur];
        nextSections[idx] = nextSection;
        return {
          ...p,
          wardBusiness: "",
          releases: "",
          sustainings: "",
          wardBusinessSections: nextSections,
        };
      });
    },
    [],
  );
  const editingSection = useMemo(
    () => (program.wardBusinessSections ?? []).find((s) => s.id === wardEditSectionId) ?? null,
    [program.wardBusinessSections, wardEditSectionId],
  );

  const addSpeakerSlot = useCallback(() => {
    setSpeakers((prev) => {
      const normalized = normalizeSpeakerSlots(prev);
      if (normalized.length >= MAX_DISCOURSE_SLOTS) return normalized;
      return normalizeSpeakerSlots([
        ...normalized,
        { position: normalized.length + 1, member_id: null, topic: "" },
      ]);
    });
  }, []);

  const removeSpeakerSlotAtIndex = useCallback((index: number) => {
    setSpeakers((prev) => {
      const normalized = normalizeSpeakerSlots(prev);
      if (normalized.length <= MIN_DISCOURSE_SLOTS) return normalized;
      if (index < 0 || index >= normalized.length) return normalized;
      const next = normalized.filter((_, i) => i !== index);
      return normalizeSpeakerSlots(renumberSpeakerSlots(next));
    });
  }, []);

  const strictRoleOptions = useCallback(
    (ids: string[], currentId: string | null) => {
      const byId = new Map(bundle?.members.map((m) => [m.id, m]) ?? []);
      const filtered = ids.map((id) => byId.get(id)).filter((m): m is { id: string; name: string } => Boolean(m));
      if (currentId && !filtered.some((m) => m.id === currentId)) {
        const currentMember = byId.get(currentId);
        if (currentMember) return [currentMember, ...filtered];
      }
      return filtered;
    },
    [bundle?.members],
  );

  const presidingOptions = useMemo(
    () => strictRoleOptions(bundle?.suggestions?.presidingIds ?? [], presiding),
    [bundle?.suggestions?.presidingIds, strictRoleOptions, presiding],
  );
  const conductingOptions = useMemo(
    () => strictRoleOptions(bundle?.suggestions?.conductingIds ?? [], conducting),
    [bundle?.suggestions?.conductingIds, strictRoleOptions, conducting],
  );
  const choristerOptions = useMemo(
    () => strictRoleOptions(bundle?.suggestions?.choristerIds ?? [], chorister),
    [bundle?.suggestions?.choristerIds, strictRoleOptions, chorister],
  );
  const organistOptions = useMemo(
    () => strictRoleOptions(bundle?.suggestions?.organistIds ?? [], organist),
    [bundle?.suggestions?.organistIds, strictRoleOptions, organist],
  );
  const memberNameById = useMemo(
    () => new Map((bundle?.members ?? []).map((m) => [m.id, m.name])),
    [bundle?.members],
  );
  const callingTitleById = useMemo(
    () =>
      new Map(
        (bundle?.callingPositions ?? []).map((p) => [
          p.id,
          formLang === "es" ? p.titleEs : p.titleEn,
        ]),
      ),
    [bundle?.callingPositions, formLang],
  );
  const sectionTemplateBodyByKey = useMemo(() => {
    const entries = Object.entries(bundle?.sectionTemplates ?? {});
    return new Map(entries.map(([key, value]) => [key, formLang === "es" ? value.es : value.en]));
  }, [bundle?.sectionTemplates, formLang]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "ward-business-section-render-debug-1",
        hypothesisId: "H2",
        location: "SacramentClient.tsx:wardBusinessSectionCards",
        message: "Rendered ward business section cards",
        data: {
          count: (program.wardBusinessSections ?? []).length,
          kinds: (program.wardBusinessSections ?? []).map((s) => s.kind),
          sustainingEntryCounts: (program.wardBusinessSections ?? []).map((s) =>
            s.kind === "sustainings" ? s.sustainingEntries?.length ?? 0 : 0,
          ),
          releaseEntryCounts: (program.wardBusinessSections ?? []).map((s) =>
            s.kind === "releases" ? s.releaseEntries?.length ?? 0 : 0,
          ),
          releaseLegacyLineCounts: (program.wardBusinessSections ?? []).map((s) =>
            s.kind === "releases"
              ? s.body
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.includes("—")).length
              : 0,
          ),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [program.wardBusinessSections]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "sacrament-presidencia-filter-debug-1",
        hypothesisId: "H1",
        location: "SacramentClient.tsx:presidenciaOptions",
        message: "Computed dropdown options for Presidencia y dirección",
        data: {
          wardId: effectiveWardId,
          totalMembers: bundle?.members?.length ?? 0,
          presidingSuggestedIds: bundle?.suggestions?.presidingIds?.length ?? 0,
          conductingSuggestedIds: bundle?.suggestions?.conductingIds?.length ?? 0,
          choristerSuggestedIds: bundle?.suggestions?.choristerIds?.length ?? 0,
          organistSuggestedIds: bundle?.suggestions?.organistIds?.length ?? 0,
          presidingOptionCount: presidingOptions.length,
          conductingOptionCount: conductingOptions.length,
          choristerOptionCount: choristerOptions.length,
          organistOptionCount: organistOptions.length,
          presidingTop: presidingOptions.slice(0, 5).map((m) => m.name),
          conductingTop: conductingOptions.slice(0, 5).map((m) => m.name),
          choristerTop: choristerOptions.slice(0, 5).map((m) => m.name),
          organistTop: organistOptions.slice(0, 5).map((m) => m.name),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [
    bundle?.members,
    bundle?.suggestions?.presidingIds,
    bundle?.suggestions?.conductingIds,
    bundle?.suggestions?.choristerIds,
    bundle?.suggestions?.organistIds,
    presidingOptions,
    conductingOptions,
    choristerOptions,
    organistOptions,
    effectiveWardId,
  ]);

  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "sacrament-title-debug-1",
      hypothesisId: "H1",
      location: "SacramentClient.tsx:headerLabels",
      message: "Computed sacrament page header labels",
      data: {
        effectiveWardId,
        wardDisplayName,
        showSundayFieldLabel: false,
        presidingSuggestedCount: bundle?.suggestions?.presidingIds?.length ?? 0,
        conductingSuggestedCount: bundle?.suggestions?.conductingIds?.length ?? 0,
        choristerSuggestedCount: bundle?.suggestions?.choristerIds?.length ?? 0,
        organistSuggestedCount: bundle?.suggestions?.organistIds?.length ?? 0,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">
          {`Reunion sacramental - Barrio ${wardDisplayName}`}
        </h1>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <label htmlFor="sacrament-form-lang" className="flex items-center gap-2 text-sm">
            <select
              id="sacrament-form-lang"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={formLang}
              onChange={(e) => setFormLang(e.target.value as SacramentFormLang)}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </label>
          <Link
            href={`/sacrament/print?ward=${encodeURIComponent(effectiveWardId)}&date=${encodeURIComponent(effectiveMeetingDate)}&lang=${formLang}`}
            target="_blank"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm hover:bg-surface-hover"
          >
            {formT(formLang, { en: "Print / PDF", es: "Imprimir / PDF" })}
          </Link>
          <div className="text-sm" aria-live="polite">
            {saveMsg ? (
              <span className="text-red-600">{saveMsg}</span>
            ) : saving ? (
              <span className="text-foreground/70">
                {formT(formLang, { en: "Saving…", es: "Guardando…" })}
              </span>
            ) : saveSuccess ? (
              <span className="text-green-700 dark:text-green-400">
                {formT(formLang, { en: "Saved.", es: "Guardado." })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
        {wards.length > 1 ? (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <FieldLabel lang={formLang} en="Ward" es="Barrio" />
              <select
                className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={wardId}
                onChange={(e) => navigateWardDate(e.target.value, effectiveMeetingDate)}
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        <div className="mt-2">
          <SacramentSundayStrip
            lang={formLang}
            displayLongLabel={sacramentSundayLongLabel(displayWeekIso, formLang)}
            prevSacramentUrl={prevSacramentUrlLive}
            nextSacramentUrl={nextSacramentUrlLive}
            onPrevClick={handlePrevWeekClick}
            onNextClick={handleNextWeekClick}
          />
        </div>
      </div>

      {!formFieldsMounted || !bundle ? (
        <SacramentFormSkeleton />
      ) : (
      <div className="space-y-8">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, {
                en: "Header and introductory items",
                es: "Encabezado e introducción",
              })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-foreground">
                  {formT(formLang, {
                    en: "Greeting and welcome – visitors",
                    es: "Saludo y bienvenida – Visitantes",
                  })}
                </p>
              </div>
              <div className="sm:col-span-2">
                <FieldLabel lang={formLang} en="Recognition of authorities" es="Reconocimiento de las autoridades" />
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={program.recognitionNote}
                  onChange={(e) => updateProgram("recognitionNote", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, { en: "Presiding and conducting", es: "Presidencia y dirección" })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel lang={formLang} en="Presides" es="Preside" />
                <MemberSelect
                  id="presiding"
                  members={presidingOptions}
                  value={presiding}
                  onChange={setPresiding}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Conducts" es="Dirige" />
                <MemberSelect
                  id="conducts"
                  members={conductingOptions}
                  value={conducting}
                  onChange={setConducting}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Music leader / chorister" es="Corista" />
                <MemberSelect
                  id="chorister"
                  members={choristerOptions}
                  value={chorister}
                  onChange={setChorister}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Organist / pianist" es="Organista" />
                <MemberSelect
                  id="organist"
                  members={organistOptions}
                  value={organist}
                  onChange={setOrganist}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, {
                en: "Announcements and initial worship",
                es: "Anuncios y culto inicial",
              })}
            </h2>
            <div className="mt-4 grid gap-4">
              <div>
                <FieldLabel lang={formLang} en="Announcements" es="Anuncios" />
                <textarea
                  className="mt-1 min-h-[96px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={program.announcements}
                  onChange={(e) => updateProgram("announcements", e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel lang={formLang} en="Opening hymn" es="Primer himno" />
                  <HymnInput
                    id="opening-hymn"
                    value={program.openingHymn}
                    onChange={(next) => updateProgram("openingHymn", next)}
                    placeholder={formT(formLang, { en: "Hymn name", es: "Nombre del himno" })}
                  />
                </div>
                <div>
                  <FieldLabel lang={formLang} en="Opening prayer" es="Primera oración" />
                  <MemberSelect
                    id="openPray"
                    members={bundle.members}
                    value={openingPrayer}
                    onChange={(v) => {
                      if (v !== openingPrayer) {
                        setOpeningPrayerResponse("pending");
                        setOpeningPrayerNote(null);
                        setOpeningPrayerFulfilled(null);
                      }
                      setOpeningPrayer(v);
                    }}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                  {formT(formLang, {
                    en: "Opening prayer — assignment (Members tab)",
                    es: "Oración inicial — asignación (Miembros)",
                  })}
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <FieldLabel lang={formLang} en="Response" es="Respuesta" />
                    <select
                      id="openPray-res"
                      disabled={!openingPrayer}
                      className={SACRAMENT_SELECT_ROW_CLASS}
                      value={openingPrayerResponse}
                      onChange={(e) => setOpeningPrayerResponse(e.target.value as TalkResponseStatus)}
                    >
                      <option value="pending">{formT(formLang, { en: "Pending", es: "Pendiente" })}</option>
                      <option value="accepted">{formT(formLang, { en: "Accepted", es: "Aceptó" })}</option>
                      <option value="declined">{formT(formLang, { en: "Declined", es: "Declinó" })}</option>
                    </select>
                  </div>
                  <div>
                    <FieldLabel
                      lang={formLang}
                      en="Note (e.g. reason if declined)"
                      es="Nota (p. ej. motivo si declinó)"
                    />
                    <textarea
                      disabled={!openingPrayer}
                      className={SACRAMENT_ASSIGNMENT_NOTE_CLASS}
                      rows={1}
                      value={openingPrayerNote ?? ""}
                      onChange={(e) => setOpeningPrayerNote(e.target.value || null)}
                    />
                  </div>
                  <div>
                    <FieldLabel lang={formLang} en="Prayed that Sunday?" es="¿Oró ese domingo?" />
                    <select
                      id="openPray-ful"
                      disabled={!openingPrayer}
                      className={SACRAMENT_SELECT_ROW_CLASS}
                      value={
                        openingPrayerFulfilled === true ? "yes" : openingPrayerFulfilled === false ? "no" : ""
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setOpeningPrayerFulfilled(v === "yes" ? true : v === "no" ? false : null);
                      }}
                    >
                      <option value="">{formT(formLang, { en: "Unknown", es: "Desconocido" })}</option>
                      <option value="yes">{formT(formLang, { en: "Yes", es: "Sí" })}</option>
                      <option value="no">{formT(formLang, { en: "No", es: "No" })}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* First pause: before ward / stake business */}
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-foreground/45">
            <div className="h-px flex-1 bg-border" />
            <span>
              {formT(formLang, {
                en: "Pause",
                es: "Pausa",
              })}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, { en: "Ward business", es: "Asuntos del barrio" })}
            </h2>
            <p className="mt-1 text-sm text-foreground/70">
              {formT(formLang, {
                en: "Add a section for each item on the program (or none). Stake representative is entered below, after ward business.",
                es: "Agrega una sección por cada tema del programa (o ninguna). El representante de la estaca va abajo, después de los asuntos del barrio.",
              })}
            </p>
            <div className="mt-4 space-y-4">
              {(program.wardBusinessSections ?? [])
                .map((sec, idx) => ({ sec, idx }))
                .sort((a, b) => {
                  const orderDelta = wardBusinessSectionDisplayOrder(a.sec) - wardBusinessSectionDisplayOrder(b.sec);
                  if (orderDelta !== 0) return orderDelta;
                  return a.idx - b.idx;
                })
                .map(({ sec }, idx) => {
                const releaseLines =
                  sec.kind === "releases"
                    ? (sec.releaseEntries && sec.releaseEntries.length > 0
                        ? sec.releaseEntries.map((e) => ({
                            n: memberNameById.get(e.memberId) ?? "",
                            c: callingTitleById.get(e.callingPositionId) ?? "",
                          }))
                        : sec.body
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.includes("—"))
                            .map((line) => {
                              const parts = line.split("—").map((p) => p.trim());
                              return { n: parts[0] ?? "", c: parts.slice(1).join(" — ") };
                            }))
                    : [];
                const ordinationDeaconEntries =
                  sec.kind === "aaron_priesthood_ordination"
                    ? (sec.ordinationEntries ?? []).filter((e) => e.office === "deacon")
                    : [];
                const ordinationTeacherPriestEntries =
                  sec.kind === "aaron_priesthood_ordination"
                    ? (sec.ordinationEntries ?? []).filter((e) => e.office === "teacher" || e.office === "priest")
                    : [];
                const displayBody =
                  sec.kind === "aaron_priesthood_ordination"
                    ? (() => {
                        const hasDeacon = ordinationDeaconEntries.length > 0;
                        const hasTeacherOrPriest = ordinationTeacherPriestEntries.length > 0;
                        const deaconText = sectionTemplateBodyByKey.get("ward.ordination.deacon")?.trim() ?? "";
                        const teacherPriestText =
                          sectionTemplateBodyByKey.get("ward.ordination.teacher_priest")?.trim() ?? "";
                        if (hasDeacon && deaconText) return deaconText;
                        if (hasTeacherOrPriest && teacherPriestText) return teacherPriestText;
                        return sec.body;
                      })()
                    : sec.kind === "new_members"
                      ? ((sec.templateKey ? sectionTemplateBodyByKey.get(sec.templateKey) : null) ?? sec.body)
                    : (sec.templateKey ? sectionTemplateBodyByKey.get(sec.templateKey) : null) ??
                      sec.body;
                const newMembersParsed =
                  sec.kind === "new_members"
                    ? (() => {
                        const raw = (sec.newMembersNames ?? "").trim();
                        if (!raw) return { family: "", members: "" };
                        const firstComma = raw.indexOf(",");
                        if (firstComma < 0) return { family: raw, members: "" };
                        return {
                          family: raw.slice(0, firstComma).trim(),
                          members: raw.slice(firstComma + 1).trim(),
                        };
                      })()
                    : null;
                if (sec.kind === "aaron_priesthood_ordination") {
                  // #region agent log
                  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
                    body: JSON.stringify({
                      sessionId: "812a29",
                      runId: "ordination-text-debug-1",
                      hypothesisId: "H2",
                      location: "SacramentClient.tsx:wardBusiness:ordinationRender",
                      message: "Rendered ordination section text and entries",
                      data: {
                        sectionId: sec.id,
                        savedBody: sec.body,
                        displayBody,
                        ordinationEntriesCount: sec.ordinationEntries?.length ?? 0,
                        ordinationEntrySample: (sec.ordinationEntries ?? []).slice(0, 3),
                        deaconEntriesCount: ordinationDeaconEntries.length,
                        teacherPriestEntriesCount: ordinationTeacherPriestEntries.length,
                      },
                      timestamp: Date.now(),
                    }),
                  }).catch(() => {});
                  // #endregion
                }

                return (
                <div key={sec.id} className={`space-y-2 ${idx > 0 ? "border-t border-border pt-4" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="pt-1 text-sm font-semibold text-foreground">
                      {wardBusinessSectionDefaultTitle(sec.kind, formLang)}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-base leading-none hover:bg-surface-hover"
                        onClick={() => {
                          setWardEditSectionId(sec.id);
                          setWardAddModalOpen(true);
                        }}
                        aria-label={formT(formLang, { en: "Edit section", es: "Editar sección" })}
                        title={formT(formLang, { en: "Edit section", es: "Editar sección" })}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-base leading-none hover:bg-surface-hover"
                        onClick={() => {
                          const ok = window.confirm(
                            formT(formLang, {
                              en: "Remove this section from the program?",
                              es: "¿Quitar esta sección del programa?",
                            }),
                          );
                          if (ok) removeWardBusinessSection(sec.id);
                        }}
                        aria-label={formT(formLang, { en: "Remove section", es: "Quitar sección" })}
                        title={formT(formLang, { en: "Remove section", es: "Quitar sección" })}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  {sec.kind !== "aaron_priesthood_ordination" ? (
                    <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {displayBody}
                    </div>
                  ) : null}
                  {sec.kind === "releases" && releaseLines.length > 0 ? (
                    <div className="space-y-1">
                      {releaseLines.map((line, i) => {
                          const n = line.n;
                          const c = line.c;
                          return (
                            <div
                              key={`${sec.id}-release-${i}`}
                              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                            >
                              <ReadonlyPairRow
                                leftLabel={formT(formLang, { en: "Name", es: "Nombre" })}
                                rightLabel={formT(formLang, { en: "Calling / role", es: "Cargo" })}
                                leftValue={n}
                                rightValue={c}
                                showLabels={i === 0}
                              />
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                  {sec.kind === "sustainings" && sec.sustainingEntries && sec.sustainingEntries.length > 0 ? (
                    <div className="space-y-1">
                      {sec.sustainingEntries.map((e, i) => {
                        const n = memberNameById.get(e.memberId) ?? "";
                        const c = callingTitleById.get(e.callingPositionId) ?? "";
                        return (
                          <div key={`${sec.id}-${e.memberId}-${e.callingPositionId}`}>
                            <ReadonlyPairRow
                              leftLabel={formT(formLang, { en: "Name", es: "Nombre" })}
                              rightLabel={formT(formLang, { en: "Calling / role", es: "Cargo" })}
                              leftValue={n}
                              rightValue={c}
                              showLabels={i === 0}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {sec.kind === "new_members" ? (
                    <div className="space-y-1">
                      <ReadonlyPairRow
                        leftLabel={formT(formLang, { en: "Family name", es: "Apellido de familia" })}
                        rightLabel={formT(formLang, { en: "Members", es: "Integrantes" })}
                        leftValue={newMembersParsed?.family ?? ""}
                        rightValue={newMembersParsed?.members ?? ""}
                        showLabels
                      />
                    </div>
                  ) : null}
                  {sec.kind === "aaron_priesthood_ordination" ? (
                    <div className="space-y-3">
                      {ordinationDeaconEntries.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {sectionTemplateBodyByKey.get("ward.ordination.deacon") ?? ""}
                          </div>
                          {ordinationDeaconEntries.map((e, i) => (
                            <div key={`${sec.id}-ord-deacon-${e.memberId}`}>
                              <ReadonlyPairRow
                                leftLabel={formT(formLang, { en: "Name", es: "Nombre" })}
                                rightLabel={formT(formLang, { en: "Office", es: "Oficio" })}
                                leftValue={memberNameById.get(e.memberId) ?? ""}
                                rightValue={formT(formLang, { en: "Deacon", es: "Diácono" })}
                                showLabels={i === 0}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {ordinationTeacherPriestEntries.length > 0 ? (
                        <div className="space-y-1">
                          <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {sectionTemplateBodyByKey.get("ward.ordination.teacher_priest") ?? ""}
                          </div>
                          {ordinationTeacherPriestEntries.map((e, i) => (
                            <div key={`${sec.id}-ord-tp-${e.memberId}-${e.office}`}>
                              <ReadonlyPairRow
                                leftLabel={formT(formLang, { en: "Name", es: "Nombre" })}
                                rightLabel={formT(formLang, { en: "Office", es: "Oficio" })}
                                leftValue={memberNameById.get(e.memberId) ?? ""}
                                rightValue={
                                  e.office === "teacher"
                                    ? formT(formLang, { en: "Teacher", es: "Maestro" })
                                    : formT(formLang, { en: "Priest", es: "Presbítero" })
                                }
                                showLabels={i === 0}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                );
              })}
              <button
                type="button"
                disabled={(program.wardBusinessSections?.length ?? 0) >= MAX_WARD_BUSINESS_SECTIONS}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-hover disabled:opacity-50"
                onClick={() => {
                  setWardEditSectionId(null);
                  setWardAddModalOpen(true);
                }}
              >
                {formT(formLang, { en: "Add section…", es: "Agregar sección…" })}
              </button>
              <p className="text-[11px] text-foreground/50">
                {formT(formLang, {
                  en: `Up to ${MAX_WARD_BUSINESS_SECTIONS} sections.`,
                  es: `Hasta ${MAX_WARD_BUSINESS_SECTIONS} secciones.`,
                })}
              </p>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-base font-semibold">
                {formT(formLang, { en: "Stake business", es: "Asuntos de la estaca" })}
              </h3>
              <p className="mt-1 text-xs text-foreground/65">
                {formT(formLang, {
                  en: "Name of the person representing the stake (comes after ward business in the meeting).",
                  es: "Nombre de la persona que representará a la estaca (después de los asuntos del barrio).",
                })}
              </p>
              <FieldLabel
                lang={formLang}
                en="Stake representative"
                es="Representante de la estaca"
              />
              <input
                type="text"
                className="mt-1 h-10 w-full max-w-lg rounded-lg border border-border bg-background px-3 text-sm"
                value={program.stakeBusiness}
                onChange={(e) => updateProgram("stakeBusiness", e.target.value)}
                placeholder={formT(formLang, {
                  en: "Full name",
                  es: "Nombre completo",
                })}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, { en: "Sacrament service", es: "Servicio sacramental" })}
            </h2>
            <div className="mt-4 grid gap-4">
              <div>
                <FieldLabel lang={formLang} en="Sacramental hymn" es="Himno sacramental" />
                <HymnInput
                  id="sacrament-hymn"
                  value={program.sacramentHymn}
                  onChange={(next) => updateProgram("sacramentHymn", next)}
                  placeholder={formT(formLang, { en: "Hymn name", es: "Nombre del himno" })}
                />
              </div>
              <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3 text-sm text-foreground/80">
                <div className="mb-2 flex items-center gap-3 text-[11px] uppercase tracking-wide text-foreground/55">
                  <div className="h-px flex-1 bg-border/70" />
                  <span>
                    {formT(formLang, {
                      en: "After the sacrament has been administered",
                      es: "Después de que se ha administrado la Santa Cena",
                    })}
                  </span>
                  <div className="h-px flex-1 bg-border/70" />
                </div>
                <p>
                  {formT(formLang, {
                    en: "We thank you for your reverence during the administration of the sacrament.",
                    es: "Les agradecemos por su reverencia durante la administración de la Santa Cena.",
                  })}
                </p>
                <p className="mt-1">
                  {formT(formLang, {
                    en: "We ask the priesthood to sit with their families after passing the sacrament.",
                    es: "Agradecemos al sacerdocio; les pedimos que puedan pasar con sus familias.",
                  })}
                </p>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-foreground/45">
            <div className="h-px flex-1 bg-border" />
            <span>
              {formT(formLang, {
                en: "Pause",
                es: "Pausa",
              })}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="text-lg font-semibold">
              {formT(formLang, { en: "Speakers and closing", es: "Discursos y cierre" })}
            </h2>
            <div className="mt-4 space-y-4">
              <div className="space-y-3 rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {formT(formLang, { en: "Speakers", es: "Discursos" })}
                  </p>
                  <p className="text-[11px] text-foreground/45">
                    {formT(formLang, {
                      en: `${displaySpeakers.length} of ${MAX_DISCOURSE_SLOTS}`,
                      es: `${displaySpeakers.length} de ${MAX_DISCOURSE_SLOTS}`,
                    })}
                  </p>
                </div>
                {displaySpeakers.map((slot, idx) => (
                  <div key={slot.position} className="space-y-3 rounded-lg border border-border bg-background p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground/55">
                        {formT(formLang, {
                          en: `Speaker ${slot.position}`,
                          es: `Discurso ${slot.position}`,
                        })}
                      </p>
                      {displaySpeakers.length > MIN_DISCOURSE_SLOTS ? (
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-hover"
                          onClick={() => removeSpeakerSlotAtIndex(idx)}
                        >
                          {formT(formLang, { en: "Remove", es: "Quitar" })}
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <FieldLabel lang={formLang} en="Member" es="Miembro" />
                        <MemberSelect
                          id={`sp-${slot.position}`}
                          members={bundle.members}
                          value={slot.member_id ?? null}
                          onChange={(v) =>
                            setSpeakers((prev) => {
                              const next = [...normalizeSpeakerSlots(prev)];
                              const prevMember = next[idx]?.member_id;
                              next[idx] = {
                                ...next[idx],
                                member_id: v,
                                ...(prevMember !== v
                                  ? {
                                      response_status: "pending" as const,
                                      response_note: null,
                                      fulfilled: null,
                                    }
                                  : {}),
                              };
                              return next;
                            })
                          }
                        />
                      </div>
                      <div>
                        <FieldLabel lang={formLang} en="Topic (optional)" es="Tema (opcional)" />
                        <input
                          type="text"
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={slot.topic ?? ""}
                          onChange={(e) =>
                            setSpeakers((prev) => {
                              const next = [...normalizeSpeakerSlots(prev)];
                              next[idx] = { ...next[idx], topic: e.target.value || null };
                              return next;
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                        {formT(formLang, {
                          en: "Assignment (shown on Members tab)",
                          es: "Asignación (visible en Miembros)",
                        })}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <FieldLabel lang={formLang} en="Response" es="Respuesta" />
                          <select
                            id={`sp-res-${slot.position}`}
                            disabled={!slot.member_id}
                            className={SACRAMENT_SELECT_ROW_CLASS}
                            value={slot.response_status ?? "pending"}
                            onChange={(e) =>
                              setSpeakers((prev) => {
                                const next = [...normalizeSpeakerSlots(prev)];
                                next[idx] = {
                                  ...next[idx],
                                  response_status: e.target.value as TalkResponseStatus,
                                };
                                return next;
                              })
                            }
                          >
                            <option value="pending">{formT(formLang, { en: "Pending", es: "Pendiente" })}</option>
                            <option value="accepted">{formT(formLang, { en: "Accepted", es: "Aceptó" })}</option>
                            <option value="declined">{formT(formLang, { en: "Declined", es: "Declinó" })}</option>
                          </select>
                        </div>
                        <div className="sm:col-span-1">
                          <FieldLabel
                            lang={formLang}
                            en="Note (e.g. reason if declined)"
                            es="Nota (p. ej. motivo si declinó)"
                          />
                          <textarea
                            disabled={!slot.member_id}
                            className={SACRAMENT_ASSIGNMENT_NOTE_CLASS}
                            rows={1}
                            value={slot.response_note ?? ""}
                            onChange={(e) =>
                              setSpeakers((prev) => {
                                const next = [...normalizeSpeakerSlots(prev)];
                                next[idx] = { ...next[idx], response_note: e.target.value || null };
                                return next;
                              })
                            }
                          />
                        </div>
                        <div>
                          <FieldLabel
                            lang={formLang}
                            en="Spoke that Sunday?"
                            es="¿Discursó ese domingo?"
                          />
                          <select
                            id={`sp-del-${slot.position}`}
                            disabled={!slot.member_id}
                            className={SACRAMENT_SELECT_ROW_CLASS}
                            value={
                              slot.fulfilled === true ? "yes" : slot.fulfilled === false ? "no" : ""
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              const delivered = v === "yes" ? true : v === "no" ? false : null;
                              setSpeakers((prev) => {
                                const next = [...normalizeSpeakerSlots(prev)];
                                next[idx] = { ...next[idx], fulfilled: delivered };
                                return next;
                              });
                            }}
                          >
                            <option value="">{formT(formLang, { en: "Unknown", es: "Desconocido" })}</option>
                            <option value="yes">{formT(formLang, { en: "Yes", es: "Sí" })}</option>
                            <option value="no">{formT(formLang, { en: "No (no-show)", es: "No (no asistió)" })}</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {displaySpeakers.length < MAX_DISCOURSE_SLOTS ? (
                  <button
                    type="button"
                    className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:bg-surface-hover"
                    onClick={addSpeakerSlot}
                  >
                    {formT(formLang, { en: "Add speaker", es: "Agregar discurso" })}
                  </button>
                ) : null}
              </div>
              <div className="space-y-4 rounded-lg border border-border bg-background p-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel lang={formLang} en="Closing hymn" es="Último himno" />
                    <HymnInput
                      id="closing-hymn"
                      value={program.closingHymn}
                      onChange={(next) => updateProgram("closingHymn", next)}
                      placeholder={formT(formLang, { en: "Hymn name", es: "Nombre del himno" })}
                    />
                  </div>
                  <div>
                    <FieldLabel lang={formLang} en="Closing prayer" es="Última oración" />
                    <MemberSelect
                      id="closePray"
                      members={bundle.members}
                      value={closingPrayer}
                      onChange={(v) => {
                        if (v !== closingPrayer) {
                          setClosingPrayerResponse("pending");
                          setClosingPrayerNote(null);
                          setClosingPrayerFulfilled(null);
                        }
                        setClosingPrayer(v);
                      }}
                    />
                  </div>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                    {formT(formLang, {
                      en: "Closing prayer — assignment (Members tab)",
                      es: "Oración final — asignación (Miembros)",
                    })}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <FieldLabel lang={formLang} en="Response" es="Respuesta" />
                      <select
                        id="closePray-res"
                        disabled={!closingPrayer}
                        className={SACRAMENT_SELECT_ROW_CLASS}
                        value={closingPrayerResponse}
                        onChange={(e) => setClosingPrayerResponse(e.target.value as TalkResponseStatus)}
                      >
                        <option value="pending">{formT(formLang, { en: "Pending", es: "Pendiente" })}</option>
                        <option value="accepted">{formT(formLang, { en: "Accepted", es: "Aceptó" })}</option>
                        <option value="declined">{formT(formLang, { en: "Declined", es: "Declinó" })}</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel
                        lang={formLang}
                        en="Note (e.g. reason if declined)"
                        es="Nota (p. ej. motivo si declinó)"
                      />
                      <textarea
                        disabled={!closingPrayer}
                        className={SACRAMENT_ASSIGNMENT_NOTE_CLASS}
                        rows={1}
                        value={closingPrayerNote ?? ""}
                        onChange={(e) => setClosingPrayerNote(e.target.value || null)}
                      />
                    </div>
                    <div>
                      <FieldLabel lang={formLang} en="Prayed that Sunday?" es="¿Oró ese domingo?" />
                      <select
                        id="closePray-ful"
                        disabled={!closingPrayer}
                        className={SACRAMENT_SELECT_ROW_CLASS}
                        value={
                          closingPrayerFulfilled === true ? "yes" : closingPrayerFulfilled === false ? "no" : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          setClosingPrayerFulfilled(v === "yes" ? true : v === "no" ? false : null);
                        }}
                      >
                        <option value="">{formT(formLang, { en: "Unknown", es: "Desconocido" })}</option>
                        <option value="yes">{formT(formLang, { en: "Yes", es: "Sí" })}</option>
                        <option value="no">{formT(formLang, { en: "No", es: "No" })}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {bundle.previous ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={applyBusy}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
                onClick={() => void applyPreviousWeek()}
              >
                {applyBusy
                  ? formT(formLang, { en: "Loading…", es: "Cargando…" })
                  : formT(formLang, {
                      en: "Copy personnel & template from previous meeting (clears speakers)",
                      es: "Copiar personal y plantilla de la reunión anterior (borra discursos)",
                    })}
              </button>
            </div>
          ) : null}

      </div>
      )}

      <AddWardBusinessSectionModal
        open={wardAddModalOpen}
        onClose={() => {
          setWardAddModalOpen(false);
          setWardEditSectionId(null);
        }}
        formLang={formLang}
        members={bundle?.members ?? []}
        callingPositions={bundle?.callingPositions ?? []}
        atCapacity={!editingSection && (program.wardBusinessSections?.length ?? 0) >= MAX_WARD_BUSINESS_SECTIONS}
        editingSection={editingSection}
        onConfirm={(section) => {
          if (wardEditSectionId) {
            updateWardBusinessSection(wardEditSectionId, section);
          } else {
            appendWardBusinessSection(section);
          }
          setWardAddModalOpen(false);
          setWardEditSectionId(null);
        }}
      />
    </div>
  );
}
