"use client";

import { ActivityFormDialog } from "./ActivityFormDialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildMonthGrid,
  formatActivityDateShort,
  formatMonthLabel,
  shiftMonth,
  wardActivityCategoryLabel,
  type WardCalendarActivity,
} from "@/lib/calendar/wardActivity";
import { cn } from "@/lib/utils";
import { sundayStripCellClassName } from "@/lib/formControlStyles";
import { formatLocalISODate } from "@/lib/sacramentProgram";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FormLang = "en" | "es";

const WEEKDAY_LABELS: Record<FormLang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};

function formT(lang: FormLang, b: { en: string; es: string }) {
  return lang === "es" ? b.es : b.en;
}

function todayIso() {
  return formatLocalISODate(new Date());
}

export function CalendarClient({
  wards,
  wardId,
  month,
  initialActivities,
  members,
}: {
  wards: { id: string; name: string }[];
  wardId: string;
  month: string;
  initialActivities: WardCalendarActivity[];
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formLang, setFormLang] = useState<FormLang>("es");
  const [activities, setActivities] = useState(initialActivities);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [editingActivity, setEditingActivity] = useState<WardCalendarActivity | null>(null);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const urlWardRaw = searchParams.get("ward")?.trim() ?? "";
  const effectiveWardId = wards.some((w) => w.id === urlWardRaw) ? urlWardRaw : wardId;
  const urlMonthRaw = searchParams.get("month")?.trim() ?? "";
  const effectiveMonth = /^\d{4}-\d{2}$/.test(urlMonthRaw) ? urlMonthRaw : month;

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities, effectiveWardId, effectiveMonth]);

  const wardDisplayName = useMemo(() => {
    return wards.find((w) => w.id === effectiveWardId)?.name ?? "—";
  }, [wards, effectiveWardId]);

  const calendarHref = useCallback(
    (nextMonth: string, nextWard = effectiveWardId) => {
      const q = new URLSearchParams();
      q.set("ward", nextWard);
      q.set("month", nextMonth);
      return `/calendar?${q.toString()}`;
    },
    [effectiveWardId],
  );

  const prevMonth = shiftMonth(effectiveMonth, -1);
  const nextMonth = shiftMonth(effectiveMonth, 1);
  const grid = useMemo(() => buildMonthGrid(effectiveMonth), [effectiveMonth]);

  const activitiesByDate = useMemo(() => {
    const map = new Map<string, WardCalendarActivity[]>();
    for (const a of activities) {
      const list = map.get(a.activity_date) ?? [];
      list.push(a);
      map.set(a.activity_date, list);
    }
    return map;
  }, [activities]);

  const refreshMonth = useCallback(
    async (targetMonth: string, targetWard: string) => {
      setLoadingMonth(true);
      try {
        const res = await fetch(
          `/api/calendar/activities?wardId=${encodeURIComponent(targetWard)}&month=${encodeURIComponent(targetMonth)}`,
        );
        const json = (await res.json()) as {
          ok?: boolean;
          activities?: WardCalendarActivity[];
          error?: string;
        };
        if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load");
        setActivities(json.activities ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load calendar");
      } finally {
        setLoadingMonth(false);
      }
    },
    [],
  );

  function openAddDialog(date: string) {
    setSelectedDate(date);
    setEditingActivity(null);
    setDialogOpen(true);
  }

  function openEditDialog(activity: WardCalendarActivity) {
    setSelectedDate(activity.activity_date);
    setEditingActivity(activity);
    setDialogOpen(true);
  }

  async function handleDelete(activity: WardCalendarActivity) {
    const confirmed = window.confirm(
      formT(formLang, {
        en: `Delete "${activity.title}"?`,
        es: `¿Eliminar "${activity.title}"?`,
      }),
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `/api/calendar/activities?id=${encodeURIComponent(activity.id)}&wardId=${encodeURIComponent(effectiveWardId)}`,
        { method: "DELETE" },
      );
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to delete");
      setActivities((prev) => prev.filter((a) => a.id !== activity.id));
      toast.success(formT(formLang, { en: "Activity deleted", es: "Actividad eliminada" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function handleSaved(activity: WardCalendarActivity, warning?: string | null) {
    setActivities((prev) => {
      const idx = prev.findIndex((a) => a.id === activity.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = activity;
        return next.sort((a, b) => a.activity_date.localeCompare(b.activity_date));
      }
      return [...prev, activity].sort((a, b) => a.activity_date.localeCompare(b.activity_date));
    });

    if (warning) {
      toast.warning(
        formT(formLang, {
          en: `Activity saved, but the sacrament announcement could not be synced: ${warning}`,
          es: `Actividad guardada, pero no se pudo sincronizar el anuncio sacramental: ${warning}`,
        }),
      );
      return;
    }

    toast.success(
      formT(formLang, {
        en: activity.include_in_sacrament_program
          ? "Saved and added to sacrament announcements"
          : "Activity saved",
        es: activity.include_in_sacrament_program
          ? "Guardado y agregado a anuncios sacramentales"
          : "Actividad guardada",
      }),
    );
  }

  const today = todayIso();

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8 text-foreground">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {formT(formLang, { en: "Ward calendar", es: "Calendario del barrio" })}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">{wardDisplayName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={formLang}
            onValueChange={(v) => {
              if (v) setFormLang(v as FormLang);
            }}
          >
            <SelectTrigger className="w-[130px]" aria-label="Language">
              <SelectValue>{formLang === "es" ? "Español" : "English"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/sacrament" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {formT(formLang, { en: "Sacrament program", es: "Programa sacramental" })}
          </Link>
        </div>
      </div>

      {wards.length > 1 ? (
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">
            {formT(formLang, { en: "Ward", es: "Barrio" })}
          </label>
          <Select
            value={effectiveWardId}
            onValueChange={(v) => {
              if (v) router.push(calendarHref(effectiveMonth, v));
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

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1 sm:gap-x-2">
        <Link
          href={calendarHref(prevMonth)}
          aria-label={formT(formLang, { en: "Previous month", es: "Mes anterior" })}
          className={cn(
            sundayStripCellClassName,
            "flex h-14 w-9 items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
          )}
          onClick={() => void refreshMonth(prevMonth, effectiveWardId)}
        >
          ‹
        </Link>
        <div
          className={cn(
            sundayStripCellClassName,
            "flex h-14 min-w-0 items-center justify-center px-3 text-center text-base font-semibold capitalize leading-snug sm:h-16 sm:text-lg",
          )}
        >
          {formatMonthLabel(effectiveMonth, formLang)}
          {loadingMonth ? (
            <span className="ml-2 text-xs font-normal text-foreground/50">
              {formT(formLang, { en: "Loading…", es: "Cargando…" })}
            </span>
          ) : null}
        </div>
        <Link
          href={calendarHref(nextMonth)}
          aria-label={formT(formLang, { en: "Next month", es: "Mes siguiente" })}
          className={cn(
            sundayStripCellClassName,
            "flex h-14 w-9 items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
          )}
          onClick={() => void refreshMonth(nextMonth, effectiveWardId)}
        >
          ›
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-7 border-b border-border bg-muted/40">
          {WEEKDAY_LABELS[formLang].map((label) => (
            <div
              key={label}
              className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground/60"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((iso, idx) => {
            if (!iso) {
              return <div key={`pad-${idx}`} className="min-h-[96px] border-b border-r border-border/60 bg-muted/10 last:border-r-0" />;
            }

            const dayActivities = activitiesByDate.get(iso) ?? [];
            const dayNum = Number(iso.slice(8, 10));
            const isToday = iso === today;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => openAddDialog(iso)}
                className={cn(
                  "group min-h-[96px] border-b border-r border-border/60 p-2 text-left transition-colors last:border-r-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isToday && "bg-primary/5",
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-full text-sm font-medium",
                      isToday && "bg-primary text-primary-foreground",
                    )}
                  >
                    {dayNum}
                  </span>
                  <span className="text-[10px] text-foreground/0 transition-colors group-hover:text-foreground/50">
                    +
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {dayActivities.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(a);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditDialog(a);
                        }
                      }}
                      className={cn(
                        "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[11px] leading-tight",
                        a.include_in_sacrament_program
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-foreground/80",
                      )}
                      title={a.title}
                    >
                      {a.start_time ? `${a.start_time.slice(0, 5)} ` : ""}
                      {a.title}
                    </div>
                  ))}
                  {dayActivities.length > 3 ? (
                    <p className="px-1 text-[10px] text-foreground/50">
                      +{dayActivities.length - 3}{" "}
                      {formT(formLang, { en: "more", es: "más" })}
                    </p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {formT(formLang, { en: "Activities this month", es: "Actividades del mes" })}
          </h2>
          <Button size="sm" onClick={() => openAddDialog(today)}>
            {formT(formLang, { en: "Add activity", es: "Agregar actividad" })}
          </Button>
        </div>

        {activities.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/60">
            {formT(formLang, {
              en: "No activities yet. Click a day on the calendar or use Add activity.",
              es: "Aún no hay actividades. Haga clic en un día del calendario o use Agregar actividad.",
            })}
          </p>
        ) : (
          <ul className="space-y-2">
            {activities.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{a.title}</p>
                    <Badge variant="secondary">{wardActivityCategoryLabel(a.category, formLang)}</Badge>
                    {a.include_in_sacrament_program ? (
                      <Badge className="border-primary/30 bg-primary/10 text-primary">
                        {formT(formLang, {
                          en: `${a.announcement_weeks_before} wk announcement`,
                          es: `Anuncio ${a.announcement_weeks_before} sem.`,
                        })}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-foreground/70">
                    {formatActivityDateShort(a.activity_date, formLang)}
                    {a.start_time ? ` · ${a.start_time.slice(0, 5)}` : ""}
                    {a.end_time ? `–${a.end_time.slice(0, 5)}` : ""}
                    {a.location ? ` · ${a.location}` : ""}
                  </p>
                  {a.notes ? (
                    <p className="text-sm text-foreground/60 line-clamp-2">{a.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditDialog(a)}>
                    {formT(formLang, { en: "Edit", es: "Editar" })}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleDelete(a)}>
                    {formT(formLang, { en: "Delete", es: "Eliminar" })}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        wardId={effectiveWardId}
        lang={formLang}
        members={members}
        initialDate={selectedDate}
        activity={editingActivity}
        onSaved={handleSaved}
      />
    </div>
  );
}
