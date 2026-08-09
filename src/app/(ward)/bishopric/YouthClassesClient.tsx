"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formControlClassName } from "@/lib/formControlStyles";
import { formatLocalISODate } from "@/lib/sacramentProgram";
import {
  assignmentDisplayName,
  formatSundayLabel,
  formatSundayMonthHeading,
  sundayWindow,
} from "@/lib/sunday/sundayAssignments";
import { cn } from "@/lib/utils";
import {
  YOUTH_CLASSES,
  youthClassLabel,
  type YouthClass,
  type YouthClassAssignment,
} from "@/lib/youth/youthClassAssignment";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type MemberOption = { id: string; name: string; is_youth: boolean };

type EditorTarget = { sundayDate: string; quorum: YouthClass };

type FormState = {
  memberId: string | null;
  teacherName: string;
  topic: string;
  notes: string;
};

function emptyForm(): FormState {
  return { memberId: null, teacherName: "", topic: "", notes: "" };
}

function formFromAssignment(a: YouthClassAssignment): FormState {
  return {
    memberId: a.member_id,
    teacherName: a.teacher_name ?? "",
    topic: a.topic ?? "",
    notes: a.notes ?? "",
  };
}

function assignmentKey(sundayDate: string, quorum: YouthClass): string {
  return `${sundayDate}::${quorum}`;
}

export function YouthClassesClient({
  wardId,
  wardName,
  initialAssignments,
  members,
}: {
  wardId: string;
  wardName: string;
  initialAssignments: YouthClassAssignment[];
  members: MemberOption[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [youthOnly, setYouthOnly] = useState(true);
  const pendingClassRef = useRef<YouthClass | null>(null);

  const todayIso = formatLocalISODate(new Date());
  const sundays = useMemo(() => sundayWindow(new Date()), []);

  const memberNameById = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members],
  );

  const pickerMembers = useMemo(() => {
    const pool = youthOnly ? members.filter((m) => m.is_youth) : members;
    const list = pool.length > 0 ? pool : members;
    return list.map((m) => ({ id: m.id, name: m.name }));
  }, [members, youthOnly]);

  const byKey = useMemo(
    () => new Map(assignments.map((a) => [assignmentKey(a.sunday_date, a.quorum), a])),
    [assignments],
  );

  /** Classes with at least one saved assignment, so the grid stays focused. */
  const visibleClasses = useMemo<YouthClass[]>(() => {
    const used = new Set(assignments.map((a) => a.quorum));
    const shown = YOUTH_CLASSES.filter((c) => c === "combined" || used.has(c));
    return shown.length > 0 ? [...shown] : ["combined"];
  }, [assignments]);

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of sundays) {
      const key = iso.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(iso);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [sundays]);

  function openEditor(sundayDate: string, quorum: YouthClass) {
    const existing = byKey.get(assignmentKey(sundayDate, quorum));
    setTarget({ sundayDate, quorum });
    setForm(existing ? formFromAssignment(existing) : emptyForm());
    setFormError(null);
  }

  function closeEditor() {
    setTarget(null);
    setFormError(null);
  }

  async function handleSave() {
    if (!target) return;
    setFormError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/youth-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardId,
          sundayDate: target.sundayDate,
          quorum: target.quorum,
          memberId: form.memberId,
          teacherName: form.teacherName.trim() || null,
          topic: form.topic.trim() || null,
          notes: form.notes.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        assignment?: YouthClassAssignment | null;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Failed to save");
      }

      const saved = json.assignment ?? null;
      setAssignments((prev) => {
        const rest = prev.filter(
          (a) => assignmentKey(a.sunday_date, a.quorum) !== assignmentKey(target.sundayDate, target.quorum),
        );
        return saved
          ? [...rest, saved].sort((a, b) => a.sunday_date.localeCompare(b.sunday_date))
          : rest;
      });
      closeEditor();
      toast.success(saved ? "Assignment saved" : "Assignment cleared");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Youth Sunday Classes</h1>
          <p className="text-sm text-foreground/60">
            Which youth teaches the class each Sunday. Tap a slot to assign a teacher and topic.
          </p>
          <p className="text-xs text-foreground/45">{wardName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value=""
            modal={false}
            onValueChange={(v) => {
              pendingClassRef.current = (v as YouthClass) || null;
            }}
            onOpenChange={(nextOpen) => {
              if (nextOpen) return;
              const cls = pendingClassRef.current;
              pendingClassRef.current = null;
              if (cls) openEditor(sundays.find((iso) => iso >= todayIso) ?? sundays[0], cls);
            }}
          >
            <SelectTrigger className="w-[190px]" aria-label="Add class assignment">
              <SelectValue placeholder="Assign a class…" />
            </SelectTrigger>
            <SelectContent>
              {YOUTH_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {youthClassLabel(c)} ({youthClassLabel(c, "es")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="space-y-8">
        {grouped.map(([monthKey, monthSundays]) => (
          <section key={monthKey} className="space-y-3">
            <h2 className="px-1 text-sm font-semibold uppercase tracking-wide text-foreground/50">
              {formatSundayMonthHeading(`${monthKey}-01`)}
            </h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
              {monthSundays.map((iso) => {
                const isPast = iso < todayIso;
                return (
                  <li
                    key={iso}
                    className={cn("space-y-2 px-4 py-3.5", isPast && "opacity-60")}
                  >
                    <p className="text-sm font-medium text-foreground">
                      {formatSundayLabel(iso)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {visibleClasses.map((cls) => {
                        const assignment = byKey.get(assignmentKey(iso, cls));
                        const name = assignment
                          ? assignmentDisplayName(
                              assignment.member_id,
                              assignment.teacher_name,
                              memberNameById,
                            )
                          : "";

                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => openEditor(iso, cls)}
                            className={cn(
                              "flex min-w-[10rem] flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                              name
                                ? "border-border bg-muted/30 hover:bg-muted/50"
                                : "border-dashed border-border hover:bg-muted/30",
                            )}
                          >
                            <span className="flex items-center gap-1.5">
                              <Badge variant="secondary">{youthClassLabel(cls, "es")}</Badge>
                            </span>
                            <span
                              className={cn(
                                "text-sm",
                                name ? "text-foreground" : "text-foreground/35",
                              )}
                            >
                              {name || "Unassigned"}
                            </span>
                            {assignment?.topic ? (
                              <span className="text-xs text-foreground/45">
                                {assignment.topic}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <Dialog open={target !== null} onOpenChange={(next) => { if (!next) closeEditor(); }}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {target ? youthClassLabel(target.quorum) : "Class"} teacher
            </DialogTitle>
            <DialogDescription>
              {target ? formatSundayLabel(target.sundayDate) : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="class-member">Youth teaching</Label>
                <button
                  type="button"
                  onClick={() => setYouthOnly((v) => !v)}
                  className="text-xs text-foreground/55 underline-offset-2 hover:text-foreground hover:underline"
                >
                  {youthOnly ? "Show all members" : "Show youth only"}
                </button>
              </div>
              <div className="mt-1">
                <MemberSearchSelect
                  id="class-member"
                  lang="en"
                  members={pickerMembers}
                  value={form.memberId}
                  onChange={(id) => setForm((f) => ({ ...f, memberId: id }))}
                  emptyLabel="Search member…"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="class-teacher-name">Or type a name</Label>
              <Input
                id="class-teacher-name"
                className={cn(formControlClassName, "mt-1")}
                value={form.teacherName}
                onChange={(e) => setForm((f) => ({ ...f, teacherName: e.target.value }))}
                placeholder="Name"
              />
            </div>

            <div>
              <Label htmlFor="class-topic">Topic / lesson</Label>
              <Input
                id="class-topic"
                className={cn(formControlClassName, "mt-1")}
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                placeholder="e.g. Come Follow Me — Alma 32"
              />
            </div>

            <div>
              <Label htmlFor="class-notes">Notes</Label>
              <Textarea
                id="class-notes"
                className={cn(formControlClassName, "mt-1 min-h-[72px]")}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <p className="text-xs text-foreground/45">
              Clearing every field removes this class assignment.
            </p>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
