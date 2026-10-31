"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  FileTextIcon,
  Loader2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PREVIEW_MIN_MS = 1700;

/** Ease-out: rises fast, then slows — caps at 92% until work finishes. */
function animateStagedProgress(
  durationMs: number,
  onFrame: (pct: number, label: string) => void,
  isCancelled: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = (now: number) => {
      if (isCancelled()) {
        resolve();
        return;
      }
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const pct = Math.round(eased * 92);
      const label =
        pct < 28 ? "Reading PDF…" : pct < 58 ? "Matching members…" : "Comparing callings…";
      onFrame(pct, label);
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function sleep(ms: number, isCancelled: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const tick = () => {
      if (isCancelled() || performance.now() - started >= ms) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

type PendingReason =
  | "member_not_found"
  | "member_uncertain"
  | "position_not_found"
  | "position_uncertain";

type DrySummary = {
  pdfRows: number;
  inserts: number;
  newMembers?: number;
  keeps: number;
  pending: number;
  removes: number;
};

type InsertRow = {
  key: string;
  memberName: string;
  positionTitle: string;
  pdfTitle: string;
  organization: string;
  allowsMultiple?: boolean;
  replacesHolders?: string[];
};

type NewMemberRow = {
  key: string;
  pdfMemberName: string;
  mantleName: string;
  positionTitle: string;
  allowsMultiple: boolean;
};

type KeepRow = {
  key: string;
  memberName: string;
  positionTitle: string;
};

type PendingRow = {
  key: string;
  memberName: string;
  pdfMemberName: string;
  memberId: string | null;
  pdfTitle: string;
  organization: string;
  suggestedPositionId: string | null;
  suggestedPositionTitle: string | null;
  memberScore: number | null;
  positionScore: number | null;
  closestMemberId: string | null;
  closestMemberName: string | null;
  closestMemberScore: number | null;
  closestPositionTitle: string | null;
  closestPositionScore: number | null;
  allowsMultiple: boolean | null;
  currentHolders: string[];
  reasons: PendingReason[];
  issue: string;
  canApprove: boolean;
  customTitle?: boolean;
  approveAsTitle?: string | null;
  resolveMemberId?: string | null;
  mantleCallings?: { callingId: string; callingName: string }[];
};

type RemoveRow = {
  key: string;
  callingId?: string;
  memberId?: string;
  memberName: string;
  callingName: string;
  source?: "pdf_gap" | "review_skip";
};

type ApplySummary = {
  pdfRows: number;
  inserted: number;
  membersCreated?: number;
  kept: number;
  pendingApproved?: number;
  pendingSkipped?: number;
  removed: number;
  insertErrors?: string[];
  removeErrors?: string[];
};

type PreviewTab = "inserts" | "pending" | "removes" | "keeps";
type RowDecision = "include" | "skip" | "approve";


function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function groupByCalling<T>(
  rows: T[],
  titleOf: (row: T) => string,
  multiOf?: (row: T) => boolean | null | undefined,
): { title: string; allowsMultiple: boolean | null; rows: T[] }[] {
  const map = new Map<string, { title: string; allowsMultiple: boolean | null; rows: T[] }>();
  for (const row of rows) {
    const title = titleOf(row).trim() || "Unknown calling";
    const existing = map.get(title);
    const multi = multiOf?.(row);
    if (existing) {
      existing.rows.push(row);
      if (existing.allowsMultiple == null && multi != null) existing.allowsMultiple = multi;
    } else {
      map.set(title, {
        title,
        allowsMultiple: multi ?? null,
        rows: [row],
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    // Multi-holder callings first, then by title
    const am = a.allowsMultiple === true ? 0 : 1;
    const bm = b.allowsMultiple === true ? 0 : 1;
    if (am !== bm) return am - bm;
    return a.title.localeCompare(b.title);
  });
}

export function ImportCallingsClient({
  wards,
  defaultWardId,
}: {
  wards: { id: string; name: string }[];
  defaultWardId: string | null;
}) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadGenRef = useRef(0);
  const [wardId, setWardId] = useState(defaultWardId ?? wards[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("inserts");
  const [dry, setDry] = useState<{
    summary: DrySummary;
    inserts: InsertRow[];
    newMembers: NewMemberRow[];
    keeps: KeepRow[];
    pending: PendingRow[];
    removes: RemoveRow[];
  } | null>(null);
  const [applied, setApplied] = useState<ApplySummary | null>(null);

  /** Decisions keyed by plan row key. Defaults: inserts/removes/newMembers include; pending undecided=skip. */
  const [insertDecisions, setInsertDecisions] = useState<Record<string, RowDecision>>({});
  const [newMemberDecisions, setNewMemberDecisions] = useState<Record<string, RowDecision>>({});
  const [removeDecisions, setRemoveDecisions] = useState<Record<string, RowDecision>>({});
  const [pendingDecisions, setPendingDecisions] = useState<Record<string, RowDecision>>({});

  /** Plan removes + Mantle callings from members you explicitly Skip on Review. */
  const removeRows = useMemo(() => {
    if (!dry) return [] as RemoveRow[];
    const byId = new Map<string, RemoveRow>();
    for (const r of dry.removes) {
      byId.set(r.callingId ?? r.key, { ...r, source: r.source ?? "pdf_gap" });
    }
    for (const p of dry.pending) {
      if (pendingDecisions[p.key] !== "skip") continue;
      for (const c of p.mantleCallings ?? []) {
        if (byId.has(c.callingId)) continue;
        byId.set(c.callingId, {
          key: `rm-skip-${c.callingId}`,
          callingId: c.callingId,
          memberId: p.resolveMemberId ?? undefined,
          memberName: p.closestMemberName ?? p.memberName,
          callingName: c.callingName,
          source: "review_skip",
        });
      }
    }
    return [...byId.values()];
  }, [dry, pendingDecisions]);

  const counts = useMemo(() => {
    if (!dry) return null;
    const insertsKeep = dry.inserts.filter((r) => insertDecisions[r.key] !== "skip").length;
    const newKeep = dry.newMembers.filter((r) => newMemberDecisions[r.key] !== "skip").length;
    const removesKeep = removeRows.filter((r) => removeDecisions[r.key] !== "skip").length;
    const pendingApprove = dry.pending.filter((r) => pendingDecisions[r.key] === "approve").length;
    return {
      insertsKeep,
      newKeep,
      addTotal: insertsKeep + newKeep,
      addListed: dry.inserts.length + dry.newMembers.length,
      removesKeep,
      removesListed: removeRows.length,
      pendingApprove,
      undecided: dry.pending.filter((r) => !pendingDecisions[r.key]).length,
    };
  }, [dry, insertDecisions, newMemberDecisions, removeDecisions, pendingDecisions, removeRows]);

  const runPreviewForFile = useCallback(
    async (nextFile: File, nextWardId: string) => {
      const gen = ++loadGenRef.current;
      const isCancelled = () => loadGenRef.current !== gen;

      setBusy("preview");
      setErr(null);
      setApplied(null);
      setDry(null);
      setProgress(0);
      setProgressLabel("Reading PDF…");
      setInsertDecisions({});
      setNewMemberDecisions({});
      setRemoveDecisions({});
      setPendingDecisions({});


      const started = performance.now();

      const fetchPromise = (async () => {
        const fd = new FormData();
        fd.set("wardId", nextWardId);
        fd.set("file", nextFile);
        fd.set("dryRun", "1");
        const res = await fetch("/api/callings/import", {
          method: "POST",
          body: fd,
          credentials: "same-origin",
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          summary?: DrySummary;
          inserts?: InsertRow[];
          newMembers?: NewMemberRow[];
          keeps?: KeepRow[];
          pending?: PendingRow[];
          removes?: RemoveRow[];
        };
        if (!res.ok || !json.ok || !json.summary) {
          throw new Error(json.error ?? `Import failed (${res.status})`);
        }
        return json;
      })();

      const animPromise = animateStagedProgress(
        PREVIEW_MIN_MS,
        (pct, label) => {
          if (isCancelled()) return;
          setProgress(pct);
          setProgressLabel(label);
        },
        isCancelled,
      );

      try {
        const [json] = await Promise.all([fetchPromise, animPromise]);
        if (isCancelled()) return;

        // Hold near-complete briefly even if the API finished early
        const elapsed = performance.now() - started;
        if (elapsed < PREVIEW_MIN_MS) {
          await sleep(PREVIEW_MIN_MS - elapsed, isCancelled);
        }
        if (isCancelled()) return;

        setProgress(100);
        setProgressLabel("Ready");
        await sleep(220, isCancelled);
        if (isCancelled()) return;

        const summary = {
          pdfRows: json.summary!.pdfRows,
          inserts: json.summary!.inserts,
          newMembers: json.summary!.newMembers ?? 0,
          keeps: json.summary!.keeps,
          pending: json.summary!.pending,
          removes: json.summary!.removes,
        };
        setDry({
          summary,
          inserts: json.inserts ?? [],
          newMembers: json.newMembers ?? [],
          keeps: json.keeps ?? [],
          pending: json.pending ?? [],
          removes: json.removes ?? [],
        });
        const firstTab: PreviewTab =
          summary.inserts + (summary.newMembers ?? 0) > 0
            ? "inserts"
            : summary.pending > 0
              ? "pending"
              : summary.removes > 0
                ? "removes"
                : "keeps";
        setPreviewTab(firstTab);

      } catch (e) {
        if (isCancelled()) return;
        setErr(e instanceof Error ? e.message : "Import failed");
        setProgress(0);
        setProgressLabel("");
      } finally {
        if (!isCancelled()) setBusy(null);
      }
    },
    [],
  );

  function acceptFile(next: File | null | undefined) {
    if (!next) return;
    if (!next.name.toLowerCase().endsWith(".pdf") && next.type !== "application/pdf") {
      setErr("Please choose a PDF file (Members with Callings report).");
      return;
    }
    if (!wardId) {
      setErr("Choose a ward first");
      return;
    }
    setFile(next);
    setErr(null);
    void runPreviewForFile(next, wardId);
  }

  function clearFile() {
    loadGenRef.current += 1;
    setFile(null);
    setDry(null);
    setApplied(null);
    setBusy(null);
    setProgress(0);
    setProgressLabel("");
    setErr(null);
    setInsertDecisions({});
    setNewMemberDecisions({});
    setRemoveDecisions({});
    setPendingDecisions({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function applyImport() {
    if (!wardId || !file) {
      setErr("Choose a ward and PDF file");
      return;
    }
    setBusy("apply");
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("wardId", wardId);
      fd.set("file", file);
      fd.set(
        "decisions",
        JSON.stringify({
          inserts: insertDecisions,
          newMembers: newMemberDecisions,
          removes: removeDecisions,
          pending: pendingDecisions,
        }),
      );
      const res = await fetch("/api/callings/import", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        summary?: ApplySummary;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `Import failed (${res.status})`);
      if (json.summary) {
        setApplied(json.summary);
        setDry(null);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  function setAllPending(decision: "approve" | "skip") {
    if (!dry) return;
    const next: Record<string, RowDecision> = {};
    for (const row of dry.pending) {
      if (decision === "approve" && !row.canApprove) continue;
      next[row.key] = decision;
    }
    setPendingDecisions(next);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Import Members with Callings</h1>
        <p className="max-w-2xl text-sm text-foreground/60">
          Upload the Church PDF — we match it to Mantle automatically. Then decide what to add or
          skip and apply. Review means a name or calling needs your call.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Upload</h2>
            <p className="text-xs text-foreground/50">Church “Members with Callings” PDF</p>
          </div>
          {wards.length > 1 ? (
            <label className="flex items-center gap-2 text-sm">
              <span className="text-foreground/55">Ward</span>
              <select
                className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm"
                value={wardId}
                onChange={(e) => {
                  const next = e.target.value;
                  setWardId(next);
                  setDry(null);
                  setApplied(null);
                  if (file && !busy) void runPreviewForFile(file, next);
                }}
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <Badge variant="secondary">{wards[0]?.name ?? "Ward"}</Badge>
          )}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />

          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-all",
              dragOver
                ? "border-primary bg-primary/8"
                : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/35",
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
              <UploadCloudIcon className="size-6 text-foreground/70" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {dragOver ? "Drop PDF to upload" : "Drag & drop PDF here"}
              </p>
              <p className="mt-1 text-xs text-foreground/50">or click to browse</p>
            </div>
          </div>

          {file ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/80 px-3 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-700 dark:text-red-300">
                    <FileTextIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-foreground/50">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy === "apply"}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <XIcon data-icon="inline-start" />
                  Clear
                </Button>
              </div>

              {busy === "preview" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-foreground/70">
                      <Loader2Icon className="size-3.5 animate-spin" />
                      {progressLabel || "Working…"}
                    </span>
                    <span className="tabular-nums text-foreground/50">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground transition-[width] duration-150 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {err ? (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5 text-sm text-warning">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <p>{err}</p>
            </div>
          ) : null}
        </div>
      </section>

      {applied ? (
        <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <CheckCircle2Icon className="mt-0.5 size-5 text-emerald-700 dark:text-emerald-300" />
            <div>
              <h2 className="text-sm font-semibold">Import applied</h2>
              <p className="mt-1 text-sm text-foreground/70">
                {applied.inserted} callings added
                {applied.membersCreated ? ` · ${applied.membersCreated} new members` : ""}
                {applied.pendingApproved ? ` · ${applied.pendingApproved} from Review` : ""}
                {" · "}
                {applied.kept} unchanged · {applied.removed} removed
                {applied.pendingSkipped
                  ? ` · ${applied.pendingSkipped} review rows skipped`
                  : ""}
              </p>
              {(applied.insertErrors?.length || applied.removeErrors?.length) ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warning">
                  {[...(applied.insertErrors ?? []), ...(applied.removeErrors ?? [])].map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {dry && counts ? (
        <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight">Review matches</h2>
              <p className="text-xs text-foreground/50">
                {dry.summary.pdfRows} PDF rows · undecided Review rows are skipped on apply
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {previewTab === "pending" && dry.pending.length > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setAllPending("approve")}
                  >
                    Approve all matchable
                  </Button>
                  <Button type="button" variant="ghost" size="xs" onClick={() => setAllPending("skip")}>
                    Skip all
                  </Button>
                </>
              ) : null}
              <Button type="button" size="sm" disabled={Boolean(busy)} onClick={() => void applyImport()}>
                {busy === "apply" ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <CheckCircle2Icon data-icon="inline-start" />
                )}
                Apply
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border p-2">
            {(
              [
                {
                  id: "inserts" as const,
                  label: "Add",
                  count: counts.addTotal,
                  total: counts.addListed,
                },
                {
                  id: "pending" as const,
                  label: "Review",
                  count: counts.pendingApprove,
                  total: dry.pending.length,
                },
                {
                  id: "removes" as const,
                  label: "Remove",
                  count: counts.removesKeep,
                  total: counts.removesListed,
                },
                {
                  id: "keeps" as const,
                  label: "Unchanged",
                  count: dry.keeps.length,
                  total: dry.keeps.length,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreviewTab(t.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  previewTab === t.id
                    ? "bg-foreground text-background"
                    : "text-foreground/65 hover:bg-muted hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    previewTab === t.id ? "bg-background/20" : "bg-muted",
                  )}
                >
                  {t.id === "pending" || t.id === "inserts" || t.id === "removes"
                    ? t.count !== t.total
                      ? `${t.count}/${t.total}`
                      : t.total
                    : t.total}
                </span>
              </button>
            ))}
          </div>

            <div className="max-h-[28rem] overflow-y-auto">
              {previewTab === "inserts" ? (
                dry.inserts.length === 0 && dry.newMembers.length === 0 ? (
                  <Empty message="No callings to add." />
                ) : (
                  <div className="divide-y divide-border">
                    {dry.inserts.length > 0 ? (
                      <div className="border-b border-border bg-muted/15 px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                        Existing members
                      </div>
                    ) : null}
                    {groupByCalling(
                      dry.inserts,
                      (r) => r.positionTitle,
                      (r) => r.allowsMultiple ?? false,
                    ).map((group) => (
                      <section key={`ex-${group.title}`}>
                        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-4 py-2.5">
                          <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
                          <Badge variant="secondary">{group.rows.length}</Badge>
                          {group.allowsMultiple ? (
                            <Badge variant="outline">Allows multiple</Badge>
                          ) : (
                            <Badge variant="outline">One person</Badge>
                          )}
                        </div>
                        <ul className="divide-y divide-border">
                          {group.rows.map((r) => {
                            const skipped = insertDecisions[r.key] === "skip";
                            return (
                              <li
                                key={r.key}
                                className={cn(
                                  "flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                                  skipped && "opacity-50",
                                )}
                              >
                                <div className="min-w-0 text-sm">
                                  <p className="font-medium">{r.memberName}</p>
                                  {r.replacesHolders && r.replacesHolders.length > 0 ? (
                                    <p className="text-xs text-amber-800 dark:text-amber-300">
                                      Replaces {r.replacesHolders.join(", ")}
                                    </p>
                                  ) : null}
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={skipped ? "outline" : "ghost"}
                                  onClick={() =>
                                    setInsertDecisions((prev) => ({
                                      ...prev,
                                      [r.key]: skipped ? "include" : "skip",
                                    }))
                                  }
                                >
                                  {skipped ? "Include" : "Skip"}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}

                    {dry.newMembers.length > 0 ? (
                      <div className="border-b border-border bg-muted/15 px-4 py-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                        New members (not in Mantle yet — will be created on Apply)
                      </div>
                    ) : null}
                    {groupByCalling(
                      dry.newMembers,
                      (r) => r.positionTitle,
                      (r) => r.allowsMultiple,
                    ).map((group) => (
                      <section key={`new-${group.title}`}>
                        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-4 py-2.5">
                          <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
                          <Badge variant="secondary">{group.rows.length}</Badge>
                          {group.allowsMultiple ? (
                            <Badge variant="outline">Allows multiple</Badge>
                          ) : (
                            <Badge variant="outline">One person</Badge>
                          )}
                        </div>
                        <ul className="divide-y divide-border">
                          {group.rows.map((r) => {
                            const skipped = newMemberDecisions[r.key] === "skip";
                            return (
                              <li
                                key={r.key}
                                className={cn(
                                  "flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                                  skipped && "opacity-50",
                                )}
                              >
                                <div className="min-w-0 text-sm">
                                  <p className="font-medium">{r.mantleName}</p>
                                  <p className="text-xs text-foreground/45">
                                    From report: {r.pdfMemberName}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={skipped ? "outline" : "ghost"}
                                  onClick={() =>
                                    setNewMemberDecisions((prev) => ({
                                      ...prev,
                                      [r.key]: skipped ? "include" : "skip",
                                    }))
                                  }
                                >
                                  {skipped ? "Include" : "Skip"}
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )
              ) : null}

              {previewTab === "pending" ? (
                dry.pending.length === 0 ? (
                  <Empty message="Every PDF row matched exactly." />
                ) : (
                  <div className="divide-y divide-border">
                    {groupByCalling(
                      dry.pending,
                      (r) => r.suggestedPositionTitle || r.pdfTitle,
                      (r) => r.allowsMultiple,
                    ).map((group) => (
                      <section key={group.title}>
                        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-muted/25 px-4 py-2.5">
                          <h3 className="text-sm font-semibold tracking-tight">{group.title}</h3>
                          <Badge variant="secondary">{group.rows.length}</Badge>
                          {group.allowsMultiple === true ? (
                            <Badge variant="outline">Allows multiple</Badge>
                          ) : group.allowsMultiple === false ? (
                            <Badge variant="outline">One person</Badge>
                          ) : null}
                        </div>
                        <ul className="divide-y divide-border">
                          {group.rows.map((r) => {
                            const decision = pendingDecisions[r.key];
                            return (
                              <li key={r.key} className="space-y-2 px-4 py-3">
                                <div className="min-w-0 text-sm">
                                  <p className="font-medium">{r.pdfMemberName}</p>
                                  {r.pdfTitle !== group.title ? (
                                    <p className="text-xs text-foreground/45">PDF: {r.pdfTitle}</p>
                                  ) : null}
                                  <p className="mt-1 text-xs leading-relaxed text-foreground/55">
                                    {r.issue}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={decision === "approve" ? "default" : "outline"}
                                    disabled={!r.canApprove}
                                    title={
                                      r.canApprove
                                        ? r.customTitle
                                          ? `Insert “${r.approveAsTitle ?? r.pdfTitle}” for closest Mantle member (not in catalog)`
                                          : "Insert using closest Mantle member + calling"
                                        : "Needs a Mantle member match — add the member first, or Skip"
                                    }
                                    onClick={() =>
                                      setPendingDecisions((prev) => ({
                                        ...prev,
                                        [r.key]: "approve",
                                      }))
                                    }
                                  >
                                    {r.customTitle ? "Approve as custom" : "Approve closest"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={decision === "skip" ? "secondary" : "ghost"}
                                    onClick={() => {
                                      setPendingDecisions((prev) => ({
                                        ...prev,
                                        [r.key]: "skip",
                                      }));
                                      // Surface that member's Mantle callings on Remove
                                      if ((r.mantleCallings?.length ?? 0) > 0) {
                                        setRemoveDecisions((prev) => {
                                          const next = { ...prev };
                                          for (const c of r.mantleCallings ?? []) {
                                            const k = `rm-skip-${c.callingId}`;
                                            if (next[k] === "skip") delete next[k];
                                          }
                                          return next;
                                        });
                                        setPreviewTab("removes");
                                      }
                                    }}
                                  >
                                    Skip
                                  </Button>
                                  {decision === "approve" ? (
                                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                                      Will insert
                                      {r.customTitle
                                        ? ` “${r.approveAsTitle ?? r.pdfTitle}”`
                                        : r.approveAsTitle
                                          ? ` as ${r.approveAsTitle}`
                                          : ""}
                                    </span>
                                  ) : decision === "skip" ? (
                                    <span className="text-xs text-foreground/45">
                                      Omitted
                                      {(r.mantleCallings?.length ?? 0) > 0
                                        ? ` · ${r.mantleCallings!.length} Mantle calling(s) → Remove`
                                        : ""}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-foreground/40">
                                      Undecided → omit on apply
                                    </span>
                                  )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                )
              ) : null}

              {previewTab === "removes" ? (
                removeRows.length === 0 ? (
                  <Empty message="No Set Apart callings would be removed. Skip someone on Review to queue their Mantle callings here." />
                ) : (
                  <ul className="divide-y divide-border">
                    {removeRows.map((r) => {
                      const skipped = removeDecisions[r.key] === "skip";
                      return (
                        <li
                          key={r.key}
                          className={cn(
                            "flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                            skipped && "opacity-50",
                          )}
                        >
                          <div className="min-w-0 text-sm">
                            <p className="font-medium">{r.memberName}</p>
                            {r.source === "review_skip" ? (
                              <p className="text-xs text-amber-800 dark:text-amber-300">
                                From Review Skip — release in Mantle
                              </p>
                            ) : null}
                            <p className="text-foreground/65">{r.callingName}</p>
                            <p className="text-xs text-foreground/40">
                              {r.source === "review_skip"
                                ? "Queued because you skipped their PDF row"
                                : "Not confirmed by this PDF"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant={skipped ? "outline" : "ghost"}
                            onClick={() =>
                              setRemoveDecisions((prev) => ({
                                ...prev,
                                [r.key]: skipped ? "include" : "skip",
                              }))
                            }
                          >
                            {skipped ? "Remove" : "Keep in Mantle"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}

              {previewTab === "keeps" ? (
                dry.keeps.length === 0 ? (
                  <Empty message="No existing callings already match this report." />
                ) : (
                  <ul className="divide-y divide-border">
                    {dry.keeps.map((r) => (
                      <li key={r.key} className="px-4 py-3 text-sm">
                        <p className="font-medium">{r.memberName}</p>
                        <p className="text-foreground/65">{r.positionTitle}</p>
                      </li>
                    ))}
                  </ul>
                )
              ) : null}
            </div>
        </section>
      ) : null}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <p className="px-4 py-10 text-center text-sm text-foreground/50">{message}</p>;
}
