"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import {
  formatLocalISODate,
  parseLocalDateFromISO,
} from "@/lib/sacramentProgram";
import { cn } from "@/lib/utils";
import {
  DEFAULT_YOUTH_SCHEDULE_2026,
  YOUTH_QUORUMS,
  youthQuorumLabel,
  type YouthActivity,
  type YouthQuorum,
} from "@/lib/youth/youthActivity";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2Icon } from "lucide-react";

function formatDateLabel(iso: string): string {
  const d = parseLocalDateFromISO(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatMonthHeading(iso: string): string {
  const d = parseLocalDateFromISO(iso);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
}

function dateRangeLabel(start: string, end: string | null): string {
  if (!end || end === start) return formatDateLabel(start);
  return `${formatDateLabel(start)} – ${formatDateLabel(end)}`;
}

/** Still happening today or later (uses end_date when present). */
function isUpcomingOrToday(a: YouthActivity, todayIso: string): boolean {
  const lastDay = a.end_date && a.end_date > a.activity_date ? a.end_date : a.activity_date;
  return lastDay >= todayIso;
}

function ActivityRow({
  activity,
  highlighted,
  onEdit,
  onDelete,
}: {
  activity: YouthActivity;
  highlighted?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onEdit}
        className={cn(
          "flex w-full flex-col gap-1.5 px-4 py-3.5 pr-12 text-left transition-colors hover:bg-muted/40",
          highlighted && "bg-primary/5 hover:bg-primary/10",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{youthQuorumLabel(activity.quorum)}</Badge>
          <span className="text-xs text-foreground/45">
            {youthQuorumLabel(activity.quorum, "es")}
          </span>
          {highlighted ? (
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              This week
            </span>
          ) : null}
        </div>
        <p className="font-medium text-foreground">{activity.title}</p>
        <p className="text-sm text-foreground/65">
          {dateRangeLabel(activity.activity_date, activity.end_date)}
          {activity.youth_in_charge ? (
            <span className="text-foreground/45">
              {" · "}
              In charge: {activity.youth_in_charge}
            </span>
          ) : null}
        </p>
        {activity.notes ? (
          <p className="text-sm text-foreground/45">{activity.notes}</p>
        ) : null}
      </button>

      <button
        type="button"
        aria-label={`Delete ${activity.title}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-foreground/40 transition",
          "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          "hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <Trash2Icon className="size-4" />
      </button>
    </li>
  );
}

type FormState = {
  activityDate: string;
  endDate: string;
  title: string;
  quorum: YouthQuorum;
  youthInCharge: string;
  youthMemberId: string | null;
  notes: string;
};

function emptyForm(defaultDate = ""): FormState {
  return {
    activityDate: defaultDate,
    endDate: "",
    title: "",
    quorum: "combined",
    youthInCharge: "",
    youthMemberId: null,
    notes: "",
  };
}

function formFromActivity(a: YouthActivity): FormState {
  return {
    activityDate: a.activity_date,
    endDate: a.end_date ?? "",
    title: a.title,
    quorum: a.quorum,
    youthInCharge: a.youth_in_charge ?? "",
    youthMemberId: a.youth_member_id,
    notes: a.notes ?? "",
  };
}

export function YouthActivitiesClient({
  wardId,
  wardName,
  initialActivities,
  members,
}: {
  wardId: string;
  wardName: string;
  initialActivities: YouthActivity[];
  members: { id: string; name: string }[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<YouthActivity | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const youthMembers = useMemo(
    () => members.map((m) => ({ id: m.id, name: m.name })),
    [members],
  );

  const todayIso = formatLocalISODate(new Date());
  const currentMonthKey = todayIso.slice(0, 7);

  function isMonthCollapsed(monthKey: string): boolean {
    if (monthKey in collapsedMonths) return collapsedMonths[monthKey];
    // Past months start collapsed; current and future stay open
    return monthKey < currentMonthKey;
  }

  function toggleMonth(monthKey: string) {
    setCollapsedMonths((prev) => ({
      ...prev,
      [monthKey]: !isMonthCollapsed(monthKey),
    }));
  }

  const nextActivity = useMemo(() => {
    return (
      activities
        .filter((a) => isUpcomingOrToday(a, todayIso))
        .sort((a, b) => a.activity_date.localeCompare(b.activity_date))[0] ?? null
    );
  }, [activities, todayIso]);

  const grouped = useMemo(() => {
    const map = new Map<string, YouthActivity[]>();
    for (const a of activities) {
      const key = a.activity_date.slice(0, 7);
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [activities]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm(todayIso));
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(activity: YouthActivity) {
    setEditing(activity);
    setForm(formFromActivity(activity));
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.activityDate) {
      setFormError("Pick a date for the activity.");
      return;
    }
    if (!form.title.trim()) {
      setFormError("Add a title for the activity.");
      return;
    }
    if (form.endDate && form.endDate < form.activityDate) {
      setFormError("The end date must be on or after the start date.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/youth-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id,
          wardId,
          activityDate: form.activityDate,
          endDate: form.endDate || null,
          title: form.title.trim(),
          quorum: form.quorum,
          youthInCharge: form.youthInCharge.trim() || null,
          youthMemberId: form.youthMemberId,
          notes: form.notes.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        activity?: YouthActivity;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.activity) {
        throw new Error(json.error ?? "Failed to save");
      }
      setActivities((prev) => {
        const idx = prev.findIndex((a) => a.id === json.activity!.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = json.activity!;
          return next.sort((a, b) => a.activity_date.localeCompare(b.activity_date));
        }
        return [...prev, json.activity!].sort((a, b) =>
          a.activity_date.localeCompare(b.activity_date),
        );
      });
      setDialogOpen(false);
      toast.success("Saved");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(activity: YouthActivity) {
    if (!window.confirm(`Delete "${activity.title}"?`)) return;
    try {
      const res = await fetch(
        `/api/youth-activities?id=${encodeURIComponent(activity.id)}&wardId=${encodeURIComponent(wardId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to delete");
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function handleImportSchedule() {
    setImporting(true);
    try {
      const res = await fetch("/api/youth-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wardId,
          activities: DEFAULT_YOUTH_SCHEDULE_2026,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        activities?: YouthActivity[];
        error?: string;
      };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to import");
      setActivities((prev) =>
        [...prev, ...(json.activities ?? [])].sort((a, b) =>
          a.activity_date.localeCompare(b.activity_date),
        ),
      );
      toast.success(`Imported ${json.activities?.length ?? 0} activities`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Youth Activities</h1>
          <p className="text-sm text-foreground/60">
            Deacons, teachers, and priests activities with youth in charge.
          </p>
          <p className="text-xs text-foreground/45">{wardName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activities.length === 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={importing}
              onClick={() => void handleImportSchedule()}
            >
              {importing ? "Importing…" : "Import April–Aug schedule"}
            </Button>
          ) : null}
          <Button size="sm" onClick={openAdd}>
            Add activity
          </Button>
        </div>
      </header>

      {activities.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/10 px-6 py-12 text-center">
          <p className="text-sm text-foreground/60">
            No youth activities yet. Add one, or import the April–August schedule.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={importing}
              onClick={() => void handleImportSchedule()}
            >
              {importing ? "Importing…" : "Import schedule"}
            </Button>
            <Button size="sm" onClick={openAdd}>
              Add activity
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([monthKey, monthActivities]) => {
            const collapsed = isMonthCollapsed(monthKey);
            const isPast = monthKey < currentMonthKey;

            return (
              <section key={monthKey} className="space-y-3">
                <button
                  type="button"
                  onClick={() => toggleMonth(monthKey)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/40"
                  aria-expanded={!collapsed}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex size-5 items-center justify-center text-foreground/45 transition-transform",
                        collapsed ? "rotate-0" : "rotate-90",
                      )}
                      aria-hidden
                    >
                      ›
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide text-foreground/50">
                      {formatMonthHeading(`${monthKey}-01`)}
                    </span>
                    {isPast ? (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/45">
                        Past
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {monthActivities.length}{" "}
                    {monthActivities.length === 1 ? "activity" : "activities"}
                  </span>
                </button>

                {!collapsed ? (
                  <ul className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                    {monthActivities.map((a) => (
                      <ActivityRow
                        key={a.id}
                        activity={a}
                        highlighted={nextActivity?.id === a.id}
                        onEdit={() => openEdit(a)}
                        onDelete={() => void handleDelete(a)}
                      />
                    ))}
                  </ul>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit activity" : "Add youth activity"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ya-date">Date</Label>
                <Input
                  id="ya-date"
                  type="date"
                  className={cn(formControlClassName, "mt-1")}
                  value={form.activityDate}
                  onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="ya-end">End date (optional)</Label>
                <Input
                  id="ya-end"
                  type="date"
                  className={cn(formControlClassName, "mt-1")}
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="ya-title">Activity</Label>
              <Input
                id="ya-title"
                className={cn(formControlClassName, "mt-1")}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Volleyball"
              />
            </div>

            <div>
              <Label>Quorum</Label>
              <Select
                value={form.quorum}
                onValueChange={(v) => {
                  if (v) setForm((f) => ({ ...f, quorum: v as YouthQuorum }));
                }}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YOUTH_QUORUMS.map((q) => (
                    <SelectItem key={q} value={q}>
                      {youthQuorumLabel(q)} ({youthQuorumLabel(q, "es")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="ya-charge">Youth in charge</Label>
              <Input
                id="ya-charge"
                className={cn(formControlClassName, "mt-1")}
                value={form.youthInCharge}
                onChange={(e) => setForm((f) => ({ ...f, youthInCharge: e.target.value }))}
                placeholder="Name"
              />
            </div>

            {youthMembers.length > 0 ? (
              <div>
                <Label htmlFor="ya-member">Link member (optional)</Label>
                <MemberSearchSelect
                  id="ya-member"
                  lang="en"
                  members={youthMembers}
                  value={form.youthMemberId}
                  onChange={(id) => {
                    const name = youthMembers.find((m) => m.id === id)?.name;
                    setForm((f) => ({
                      ...f,
                      youthMemberId: id,
                      youthInCharge: name ?? f.youthInCharge,
                    }));
                  }}
                  emptyLabel="— Optional —"
                />
              </div>
            ) : null}

            <div>
              <Label htmlFor="ya-notes">Notes</Label>
              <Textarea
                id="ya-notes"
                className={cn(formControlClassName, "mt-1 min-h-[72px]")}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={busy}>
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
