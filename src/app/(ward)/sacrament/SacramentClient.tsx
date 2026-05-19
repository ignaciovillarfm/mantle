"use client";

import { AddWardBusinessSectionModal } from "./AddWardBusinessSectionModal";
import { PrayerAssignmentCard } from "./PrayerAssignmentCard";
import { SpeakerSlotCard } from "./SpeakerSlotCard";
import { TestimonyMessageEditor } from "./TestimonyMessageEditor";
import type { SacramentPageBundle } from "./loadSacramentState";
import {
  DEFAULT_SACRAMENT_PROGRAM,
  defaultTemplateKeyForWardKind,
  formatLocalISODate,
  MAX_DISCOURSE_SLOTS,
  MAX_WARD_BUSINESS_SECTIONS,
  MIN_DISCOURSE_SLOTS,
  normalizeSpeakerSlots,
  parseAnnouncementRows,
  newMembersDisplayValues,
  parseTalkResponseStatus,
  splitNewMembersTemplateBody,
  serializeAnnouncementRows,
  hasAssignedDiscourses,
  sacramentMeetingKindNotice,
  sacramentMeetingKindSectionTitle,
  sacramentMeetingProgramKind,
  sacramentSundayLongLabel,
  shiftCalendarWeek,
  startOfWeekSundayFromISO,
  wardBusinessSectionDisplayOrder,
  SACRAMENT_HYMN_INTRO,
  SACRAMENT_PRIESTHOOD_INSTRUCTION,
  SACRAMENT_REVERENCE_NOTE,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
  type SacramentProgramBody,
  type SpeakerSlot,
  type TalkResponseStatus,
  type WardBusinessSectionKind,
} from "@/lib/sacramentProgram";
import { loadSacramentPageQuery } from "@/lib/sacrament/fetchSacramentPageJson";
import { mergeSacramentBundleAfterSave } from "@/lib/sacrament/mergeSacramentBundleAfterSave";
import { firstPoolMember, roleMemberOptions } from "@/lib/sacrament/sacramentRoles";
import { SACRAMENT_PAGE_STALE_MS, sacramentQueryKeys } from "@/lib/sacrament/sacramentQueryKeys";
import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { hoverRevealRemoveClassName, removeIconMarkClassName } from "@/lib/hoverRevealRemove";
import Link from "next/link";
import { toast } from "sonner";
import { SacramentPauseSeparator, SacramentSection, sacramentFormControlClass } from "./SacramentSection";
import { sundayStripCellClassName } from "@/lib/formControlStyles";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const SACRAMENT_LANG_STORAGE_KEY = "mantle-sacrament-form-lang";
const AUTO_SAVE_DEBOUNCE_MS = 1600;

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

function formatSacramentSundayDisplayLabel(displayLongLabel: string) {
  return displayLongLabel.length > 0
    ? displayLongLabel.charAt(0).toUpperCase() + displayLongLabel.slice(1)
    : displayLongLabel;
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
  return (
    <Label className="mb-1 block font-medium text-foreground">{formT(lang, { en, es })}</Label>
  );
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
        <div className={cn("flex h-10 items-center rounded-lg px-3 text-sm", sacramentFormControlClass)}>
          {leftValue || "—"}
        </div>
      </div>
      <div>
        {showLabels ? <p className="mb-1 text-sm font-medium text-foreground">{rightLabel}</p> : null}
        <div className={cn("flex h-10 items-center rounded-lg px-3 text-sm", sacramentFormControlClass)}>
          {rightValue || "—"}
        </div>
      </div>
    </div>
  );
}

function rowsFromAnnouncementsValue(value: string): string[] {
  const parsed = parseAnnouncementRows(value);
  return parsed.length > 0 ? parsed : [""];
}

function AnnouncementRowsEditor({
  value,
  onChange,
  lang,
}: {
  value: string;
  onChange: (next: string) => void;
  lang: SacramentFormLang;
}) {
  const [rows, setRows] = useState(() => rowsFromAnnouncementsValue(value));
  const lastSyncedValueRef = useRef(value);

  useEffect(() => {
    if (value === lastSyncedValueRef.current) return;
    lastSyncedValueRef.current = value;
    setRows(rowsFromAnnouncementsValue(value));
  }, [value]);

  useEffect(() => {
    const serialized = serializeAnnouncementRows(rows);
    if (serialized === lastSyncedValueRef.current) return;
    lastSyncedValueRef.current = serialized;
    onChange(serialized);
  }, [rows, onChange]);

  const updateRow = useCallback((index: number, text: string) => {
    setRows((prev) => prev.map((row, i) => (i === index ? text : row)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, ""]);
  }, []);

  const removeRow = useCallback((index: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
  }, []);

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const canRemove = rows.length > 1 || row.trim().length > 0;
        return (
          <div key={index} className="group flex items-start gap-2">
            <Textarea
              className={cn(sacramentFormControlClass, "min-h-[56px] flex-1")}
              value={row}
              placeholder={formT(lang, {
                en: "One announcement…",
                es: "Un anuncio…",
              })}
              onChange={(e) => updateRow(index, e.target.value)}
            />
            {canRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                aria-label={formT(lang, { en: "Remove announcement", es: "Quitar anuncio" })}
                className={`h-8 w-8 shrink-0 self-center text-foreground/55 hover:bg-red-500/10 hover:text-red-600 ${hoverRevealRemoveClassName}`}
              >
                <span className={removeIconMarkClassName} aria-hidden>
                  ×
                </span>
              </Button>
            ) : null}
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={addRow}>
        {formT(lang, { en: "Add announcement…", es: "Agregar anuncio…" })}
      </Button>
    </div>
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
      <span aria-hidden="true" className="shrink-0 text-sm font-medium text-foreground/75" title="Hymn number">
        #
      </span>
      <Input
        id={`${id}-number`}
        type="text"
        inputMode="numeric"
        className={cn(sacramentFormControlClass, "h-10 w-16 shrink-0 px-2 text-center")}
        aria-label="Hymn number"
        value={parsed.numberPart}
        onChange={(e) => onChange(buildHymnValue(e.target.value, parsed.namePart))}
      />
      <Input
        id={id}
        className={cn(sacramentFormControlClass, "h-10 min-w-0 flex-1")}
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
        <Card key={i}>
          <CardContent className="space-y-3 pt-4">
            <Skeleton className="h-6 max-w-xs" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
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
  const meetingProgramKind = useMemo(
    () => sacramentMeetingProgramKind(effectiveMeetingDate),
    [effectiveMeetingDate],
  );
  const showDiscourseSlots = hasAssignedDiscourses(meetingProgramKind);

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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formLang, setFormLangState] = useState<SacramentFormLang>("es");
  const [wardAddModalOpen, setWardAddModalOpen] = useState(false);
  const [wardEditSectionId, setWardEditSectionId] = useState<string | null>(null);
  const [wardSectionToRemove, setWardSectionToRemove] = useState<string | null>(null);
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
    const pool = bundle.rolePool;
    if (m) {
      setProgram(m.program);
      setPresiding(m.presiding_member_id ?? firstPoolMember(pool?.presiding ?? []));
      setConducting(m.conducting_id ?? firstPoolMember(pool?.conducting ?? []));
      setChorister(m.chorister_member_id ?? firstPoolMember(pool?.chorister ?? []));
      setOrganist(m.organist_member_id ?? firstPoolMember(pool?.organist ?? []));
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
      setPresiding(firstPoolMember(pool?.presiding ?? []));
      setConducting(firstPoolMember(pool?.conducting ?? []));
      setChorister(firstPoolMember(pool?.chorister ?? []));
      setOrganist(firstPoolMember(pool?.organist ?? []));
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
          toast.success(formT(formLang, { en: "Saved.", es: "Guardado." }));
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
          toast.error(msg);
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
    formLang,
  ]);

  useEffect(() => {
  }, [program.openingHymn, program.sacramentHymn, program.closingHymn, program.preparationTheme]);

  const navigateWardDate = (nextWard: string, nextDate: string) => {
    const q = new URLSearchParams();
    q.set("ward", nextWard);
    q.set("date", nextDate);
    router.push(`/sacrament?${q.toString()}`);
  };

  const updateProgram = (key: keyof SacramentProgramBody, value: string) => {
    setProgram((p) => ({ ...p, [key]: value }));
  };

  const updateTestimonyMessage = useCallback((id: string, custom: string) => {
    setProgram((p) => ({
      ...p,
      testimonyMessageId: id,
      testimonyMessageCustom: custom,
    }));
  }, []);

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

  const allMembers = bundle?.members ?? [];

  const presidingPoolIds = bundle?.rolePool?.presiding ?? [];
  const conductingPoolIds = bundle?.rolePool?.conducting ?? [];
  const choristerPoolIds = bundle?.rolePool?.chorister ?? [];
  const organistPoolIds = bundle?.rolePool?.organist ?? [];

  const presidingOptions = useMemo(
    () => roleMemberOptions(presidingPoolIds, presiding, allMembers),
    [presidingPoolIds, presiding, allMembers],
  );
  const conductingOptions = useMemo(
    () => roleMemberOptions(conductingPoolIds, conducting, allMembers),
    [conductingPoolIds, conducting, allMembers],
  );
  const choristerOptions = useMemo(
    () => roleMemberOptions(choristerPoolIds, chorister, allMembers),
    [choristerPoolIds, chorister, allMembers],
  );
  const organistOptions = useMemo(
    () => roleMemberOptions(organistPoolIds, organist, allMembers),
    [organistPoolIds, organist, allMembers],
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
  }, [program.wardBusinessSections]);

  useEffect(() => {
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {`Reunion sacramental - Barrio ${wardDisplayName}`}
        </h1>
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          <Select
            value={formLang}
            onValueChange={(v) => {
              if (v) setFormLang(v as SacramentFormLang);
            }}
          >
            <SelectTrigger
              id="sacrament-form-lang"
              className="w-[130px]"
              aria-label={formT(formLang, { en: "Form language", es: "Idioma del formulario" })}
            >
              <SelectValue>{formLang === "es" ? "Español" : "English"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Link
            href={`/sacrament/print?ward=${encodeURIComponent(effectiveWardId)}&date=${encodeURIComponent(effectiveMeetingDate)}&lang=${formLang}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {formT(formLang, { en: "View preview", es: "Ver vista previa" })}
          </Link>
          <div className="text-sm" aria-live="polite">
            {saving ? (
              <Badge variant="secondary">
                {formT(formLang, { en: "Saving…", es: "Guardando…" })}
              </Badge>
            ) : saveSuccess ? (
              <Badge className="border-green-600/30 bg-green-600/10 text-green-800">
                {formT(formLang, { en: "Saved", es: "Guardado" })}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {wards.length > 1 ? (
        <div className="space-y-1">
          <FieldLabel lang={formLang} en="Ward" es="Barrio" />
          <Select
            value={wardId}
            onValueChange={(v) => {
              if (v) navigateWardDate(v, effectiveMeetingDate);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wards.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1 bg-background sm:gap-x-2">
          <div
            role="link"
            tabIndex={0}
            aria-label={formT(formLang, { en: "Previous Sunday", es: "Domingo anterior" })}
            className={cn(
              sundayStripCellClassName,
              "flex h-14 w-9 cursor-pointer items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
            )}
            onClick={() => {
              handlePrevWeekClick();
              router.push(prevSacramentUrlLive);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handlePrevWeekClick();
                router.push(prevSacramentUrlLive);
              }
            }}
          >
            ‹
          </div>
          <div
            className={cn(
              sundayStripCellClassName,
              "flex h-14 min-w-0 items-center justify-center px-3 text-center text-base font-semibold leading-snug sm:h-16 sm:text-lg",
            )}
          >
            {formatSacramentSundayDisplayLabel(sacramentSundayLongLabel(displayWeekIso, formLang))}
          </div>
          <div
            role="link"
            tabIndex={0}
            aria-label={formT(formLang, { en: "Next Sunday", es: "Domingo siguiente" })}
            className={cn(
              sundayStripCellClassName,
              "flex h-14 w-9 cursor-pointer items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
            )}
            onClick={() => {
              handleNextWeekClick();
              router.push(nextSacramentUrlLive);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleNextWeekClick();
                router.push(nextSacramentUrlLive);
              }
            }}
          >
            ›
          </div>
      </div>

      {!formFieldsMounted || !bundle ? (
        <SacramentFormSkeleton />
      ) : (
      <div className="space-y-8">
          <SacramentSection
            title={formT(formLang, {
              en: "Header and introductory items",
              es: "Encabezado e introducción",
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
                <Textarea
                  className={cn(sacramentFormControlClass, "mt-1 min-h-[72px]")}
                  value={program.recognitionNote}
                  onChange={(e) => updateProgram("recognitionNote", e.target.value)}
                />
              </div>
            </div>
          </SacramentSection>

          <SacramentSection
            title={formT(formLang, { en: "Presiding and conducting", es: "Presidencia y dirección" })}
            action={
              <Link
                href={`/sacrament/settings?ward=${encodeURIComponent(effectiveWardId)}`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
              >
                {formT(formLang, {
                  en: "Edit members",
                  es: "Configurar miembros",
                })}
              </Link>
            }
            description={formT(formLang, {
              en: "Only members you add in settings appear here. The assigned person is listed first.",
              es: "Solo aparecen los miembros que agregue en configuración. La persona asignada se muestra primero.",
            })}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel lang={formLang} en="Presides" es="Preside" />
                <MemberSearchSelect
                  id="presiding"
                  lang={formLang}
                  members={presidingOptions}
                  value={presiding}
                  onChange={setPresiding}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Conducts" es="Dirige" />
                <MemberSearchSelect
                  id="conducts"
                  lang={formLang}
                  members={conductingOptions}
                  value={conducting}
                  onChange={setConducting}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Music leader / chorister" es="Corista" />
                <MemberSearchSelect
                  id="chorister"
                  lang={formLang}
                  members={choristerOptions}
                  value={chorister}
                  onChange={setChorister}
                />
              </div>
              <div>
                <FieldLabel lang={formLang} en="Organist / pianist" es="Organista" />
                <MemberSearchSelect
                  id="organist"
                  lang={formLang}
                  members={organistOptions}
                  value={organist}
                  onChange={setOrganist}
                />
              </div>
            </div>
          </SacramentSection>

          <SacramentSection
            title={formT(formLang, {
              en: "Announcements and initial worship",
              es: "Anuncios y culto inicial",
            })}
          >
            <div className="grid gap-4">
              <div>
                <FieldLabel lang={formLang} en="Announcements" es="Anuncios" />
                <p className="mt-0.5 text-xs text-foreground/55">
                  {formT(formLang, {
                    en: "Each box is one line on the printed program.",
                    es: "Cada cuadro es un renglón en el programa impreso.",
                  })}
                </p>
                <div className="mt-2">
                  <AnnouncementRowsEditor
                    value={program.announcements}
                    onChange={(next) => updateProgram("announcements", next)}
                    lang={formLang}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <FieldLabel lang={formLang} en="Opening hymn" es="Primer himno" />
                  <HymnInput
                    id="opening-hymn"
                    value={program.openingHymn}
                    onChange={(next) => updateProgram("openingHymn", next)}
                    placeholder={formT(formLang, { en: "Hymn name", es: "Nombre del himno" })}
                  />
                </div>
                <PrayerAssignmentCard
                  variant="opening"
                  lang={formLang}
                  members={bundle.members}
                  memberId={openingPrayer}
                  memberName={openingPrayer ? (memberNameById.get(openingPrayer) ?? null) : null}
                  responseStatus={openingPrayerResponse}
                  responseNote={openingPrayerNote}
                  fulfilled={openingPrayerFulfilled}
                  onMemberChange={setOpeningPrayer}
                  onResponseChange={setOpeningPrayerResponse}
                  onNoteChange={setOpeningPrayerNote}
                  onFulfilledChange={setOpeningPrayerFulfilled}
                />
              </div>
            </div>
          </SacramentSection>

          {/* First pause: before ward / stake business */}
          <SacramentPauseSeparator
            label={formT(formLang, { en: "Pause", es: "Pausa" })}
          />

          <SacramentSection
            title={formT(formLang, { en: "Ward business", es: "Asuntos del barrio" })}
            description={formT(formLang, {
              en: "Add a section for each item on the program (or none). Stake representative is entered below, after ward business.",
              es: "Agrega una sección por cada tema del programa (o ninguna). El representante de la estaca va abajo, después de los asuntos del barrio.",
            })}
          >
            <div className="space-y-4">
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
                    : (sec.templateKey ? sectionTemplateBodyByKey.get(sec.templateKey) : null) ??
                      sec.body;
                const newMembersParsed =
                  sec.kind === "new_members" ? newMembersDisplayValues(sec, formLang) : null;
                const newMembersTemplateParts =
                  sec.kind === "new_members"
                    ? splitNewMembersTemplateBody(
                        (sec.templateKey ? sectionTemplateBodyByKey.get(sec.templateKey) : null)?.trim() ??
                          "",
                      )
                    : null;
                if (sec.kind === "aaron_priesthood_ordination") {
                }

                return (
                <div
                  key={sec.id}
                  className={`group space-y-2 ${idx > 0 ? "border-t border-border pt-4" : ""}`}
                >
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
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border hover:bg-red-500/10 hover:text-red-600 ${hoverRevealRemoveClassName}`}
                        onClick={() => setWardSectionToRemove(sec.id)}
                        aria-label={formT(formLang, { en: "Remove section", es: "Quitar sección" })}
                        title={formT(formLang, { en: "Remove section", es: "Quitar sección" })}
                      >
                        <span className={removeIconMarkClassName} aria-hidden>
                          ×
                        </span>
                      </button>
                    </div>
                  </div>
                  {sec.kind !== "aaron_priesthood_ordination" && sec.kind !== "new_members" ? (
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
                    <div className="space-y-2">
                      {newMembersTemplateParts?.before ? (
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          {newMembersTemplateParts.before}
                        </p>
                      ) : null}
                      <ReadonlyPairRow
                        leftLabel={formT(formLang, { en: "Family name", es: "Apellido de familia" })}
                        rightLabel={formT(formLang, { en: "Members", es: "Integrantes" })}
                        leftValue={newMembersParsed?.familyName ?? ""}
                        rightValue={newMembersParsed?.familyMembers ?? ""}
                        showLabels
                      />
                      {newMembersTemplateParts?.after ? (
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          {newMembersTemplateParts.after}
                        </p>
                      ) : null}
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
              <Button
                type="button"
                variant="outline"
                disabled={(program.wardBusinessSections?.length ?? 0) >= MAX_WARD_BUSINESS_SECTIONS}
                onClick={() => {
                  setWardEditSectionId(null);
                  setWardAddModalOpen(true);
                }}
              >
                {formT(formLang, { en: "Add section…", es: "Agregar sección…" })}
              </Button>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-base font-semibold">
                {formT(formLang, { en: "Stake business", es: "Asuntos de la estaca" })}
              </h3>
              <p className="mt-1 text-xs text-foreground/75">
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
              <Input
                className={cn(sacramentFormControlClass, "mt-1 max-w-lg")}
                value={program.stakeBusiness}
                onChange={(e) => updateProgram("stakeBusiness", e.target.value)}
                placeholder={formT(formLang, {
                  en: "Full name",
                  es: "Nombre completo",
                })}
              />
            </div>
          </SacramentSection>

          <SacramentSection
            title={formT(formLang, { en: "Sacrament service", es: "Servicio sacramental" })}
          >
            <div className="grid gap-4">
              <p className="text-sm text-foreground/85">
                {formT(formLang, {
                  en: SACRAMENT_HYMN_INTRO.en,
                  es: SACRAMENT_HYMN_INTRO.es,
                })}
              </p>
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
                    en: SACRAMENT_REVERENCE_NOTE.en,
                    es: SACRAMENT_REVERENCE_NOTE.es,
                  })}
                </p>
                <p className="mt-1">
                  {formT(formLang, {
                    en: SACRAMENT_PRIESTHOOD_INSTRUCTION.en,
                    es: SACRAMENT_PRIESTHOOD_INSTRUCTION.es,
                  })}
                </p>
              </div>
            </div>
          </SacramentSection>

          <SacramentPauseSeparator
            label={formT(formLang, { en: "Pause", es: "Pausa" })}
          />

          <SacramentSection title={sacramentMeetingKindSectionTitle(meetingProgramKind, formLang)}>
            {showDiscourseSlots ? (
            <div className="space-y-3">
              {displaySpeakers.map((slot, idx) => (
                <Fragment key={slot.position}>
                  {idx > 0 ? <Separator className="my-5" /> : null}
                  <SpeakerSlotCard
                    slot={slot}
                    lang={formLang}
                    members={bundle.members}
                    memberName={
                      slot.member_id ? (memberNameById.get(slot.member_id) ?? null) : null
                    }
                    canRemove={displaySpeakers.length > MIN_DISCOURSE_SLOTS}
                    onRemove={() => removeSpeakerSlotAtIndex(idx)}
                    onChange={(next) =>
                      setSpeakers((prev) => {
                        const slots = [...normalizeSpeakerSlots(prev)];
                        slots[idx] = next;
                        return slots;
                      })
                    }
                  />
                </Fragment>
              ))}
              {displaySpeakers.length < MAX_DISCOURSE_SLOTS ? (
                <Button type="button" variant="outline" onClick={addSpeakerSlot}>
                  {formT(formLang, { en: "Add speaker…", es: "Agregar discurso…" })}
                </Button>
              ) : null}
            </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-foreground/85">
                  {sacramentMeetingKindNotice(meetingProgramKind, formLang)}
                </p>
                {meetingProgramKind === "testimony" ? (
                  <TestimonyMessageEditor
                    lang={formLang}
                    meetingDate={effectiveMeetingDate}
                    messageId={program.testimonyMessageId}
                    messageCustom={program.testimonyMessageCustom}
                    usage={bundle?.testimonyMessageUsage ?? []}
                    onChange={updateTestimonyMessage}
                  />
                ) : null}
              </div>
            )}
          </SacramentSection>

          <SacramentPauseSeparator
            label={formT(formLang, { en: "Pause", es: "Pausa" })}
          />

          <SacramentSection
            title={formT(formLang, { en: "Closing", es: "Cierre" })}
          >
            <div className="space-y-4">
              <div>
                <FieldLabel lang={formLang} en="Closing hymn" es="Último himno" />
                    <HymnInput
                      id="closing-hymn"
                      value={program.closingHymn}
                      onChange={(next) => updateProgram("closingHymn", next)}
                      placeholder={formT(formLang, { en: "Hymn name", es: "Nombre del himno" })}
                    />
                  </div>
                  <PrayerAssignmentCard
                    variant="closing"
                    lang={formLang}
                    members={bundle.members}
                    memberId={closingPrayer}
                    memberName={closingPrayer ? (memberNameById.get(closingPrayer) ?? null) : null}
                    responseStatus={closingPrayerResponse}
                    responseNote={closingPrayerNote}
                    fulfilled={closingPrayerFulfilled}
                    onMemberChange={setClosingPrayer}
                    onResponseChange={setClosingPrayerResponse}
                    onNoteChange={setClosingPrayerNote}
                onFulfilledChange={setClosingPrayerFulfilled}
              />
            </div>
          </SacramentSection>

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

      <AlertDialog
        open={wardSectionToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setWardSectionToRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {formT(formLang, { en: "Remove section?", es: "¿Quitar sección?" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formT(formLang, {
                en: "Remove this section from the program?",
                es: "¿Quitar esta sección del programa?",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {formT(formLang, { en: "Cancel", es: "Cancelar" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (wardSectionToRemove) removeWardBusinessSection(wardSectionToRemove);
                setWardSectionToRemove(null);
              }}
            >
              {formT(formLang, { en: "Remove", es: "Quitar" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
