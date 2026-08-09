"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { TimePickerField } from "@/components/TimePickerField";
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
import {
  ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS,
  announcementWeeksBeforeLabel,
  buildDefaultAnnouncementText,
  formatSacramentWeekShort,
  sacramentAnnouncementWeeks,
  wardActivityCategoryLabel,
  type AnnouncementWeeksBefore,
  type WardActivityCategory,
  type WardCalendarActivity,
  WARD_ACTIVITY_CATEGORIES,
} from "@/lib/calendar/wardActivity";
import { cn } from "@/lib/utils";
import { sacramentFormControlClass } from "@/app/(ward)/sacrament/SacramentSection";
import { useEffect, useMemo, useState } from "react";

type FormLang = "en" | "es";

function formT(lang: FormLang, b: { en: string; es: string }) {
  return lang === "es" ? b.es : b.en;
}

export type ActivityFormValues = {
  activityDate: string;
  title: string;
  notes: string;
  location: string;
  startTime: string;
  endTime: string;
  category: WardActivityCategory;
  organizerMemberId: string | null;
  includeInSacramentProgram: boolean;
  announcementWeeksBefore: AnnouncementWeeksBefore;
  announcementText: string;
};

function emptyForm(date: string, category: WardActivityCategory = "activity"): ActivityFormValues {
  return {
    activityDate: date,
    title: "",
    notes: "",
    location: "",
    startTime: "",
    endTime: "",
    category,
    organizerMemberId: null,
    includeInSacramentProgram: false,
    announcementWeeksBefore: 1,
    announcementText: "",
  };
}

function formFromActivity(activity: WardCalendarActivity): ActivityFormValues {
  return {
    activityDate: activity.activity_date,
    title: activity.title,
    notes: activity.notes ?? "",
    location: activity.location ?? "",
    startTime: activity.start_time ?? "",
    endTime: activity.end_time ?? "",
    category: activity.category,
    organizerMemberId: activity.organizer_member_id,
    includeInSacramentProgram: activity.include_in_sacrament_program,
    announcementWeeksBefore: activity.announcement_weeks_before,
    announcementText: activity.announcement_text ?? "",
  };
}

export function ActivityFormDialog({
  open,
  onOpenChange,
  wardId,
  lang,
  members,
  initialDate,
  activity,
  defaultCategory = "activity",
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wardId: string;
  lang: FormLang;
  members: { id: string; name: string }[];
  initialDate: string;
  activity: WardCalendarActivity | null;
  defaultCategory?: WardActivityCategory;
  onSaved: (activity: WardCalendarActivity, warning?: string | null) => void;
}) {
  const [form, setForm] = useState<ActivityFormValues>(() => emptyForm(initialDate, defaultCategory));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAnnouncement, setCustomAnnouncement] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (activity) {
      const next = formFromActivity(activity);
      setForm(next);
      setCustomAnnouncement(Boolean(next.announcementText.trim()));
    } else {
      setForm(emptyForm(initialDate, defaultCategory));
      setCustomAnnouncement(false);
    }
    setError(null);
  }, [open, activity, initialDate, defaultCategory]);

  const previewAnnouncement = useMemo(() => {
    if (customAnnouncement && form.announcementText.trim()) {
      return form.announcementText.trim();
    }
    return buildDefaultAnnouncementText(
      {
        title: form.title || formT(lang, { en: "Activity title", es: "Título de actividad" }),
        activityDate: form.activityDate,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        location: form.location || null,
        notes: form.notes || null,
      },
      lang,
    );
  }, [customAnnouncement, form, lang]);

  const announcementWeeks = form.activityDate && form.includeInSacramentProgram
    ? sacramentAnnouncementWeeks(form.activityDate, form.announcementWeeksBefore)
    : [];

  async function handleSave() {
    setError(null);
    if (!form.title.trim()) {
      setError(formT(lang, { en: "Title is required.", es: "El título es obligatorio." }));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/calendar/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activity?.id,
          wardId,
          activityDate: form.activityDate,
          title: form.title.trim(),
          notes: form.notes.trim() || null,
          location: form.location.trim() || null,
          startTime: form.startTime.trim() || null,
          endTime: form.endTime.trim() || null,
          category: form.category,
          organizerMemberId: form.organizerMemberId,
          includeInSacramentProgram: form.includeInSacramentProgram,
          announcementWeeksBefore: form.announcementWeeksBefore,
          announcementText:
            form.includeInSacramentProgram && customAnnouncement
              ? form.announcementText.trim() || null
              : null,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        warning?: string;
        activity?: WardCalendarActivity;
      };
      if (!res.ok || !json.ok || !json.activity) {
        throw new Error(json.error ?? "Failed to save");
      }
      onSaved(json.activity, json.warning ?? null);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {activity
              ? formT(lang, { en: "Edit activity", es: "Editar actividad" })
              : formT(lang, { en: "Add activity", es: "Agregar actividad" })}
          </DialogTitle>
          <DialogDescription>
            {formT(lang, {
              en: "Plan ward activities with date, time, location, and notes.",
              es: "Planifique actividades del barrio con fecha, hora, lugar y notas.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="activity-date">
                {formT(lang, { en: "Date", es: "Fecha" })}
              </Label>
              <Input
                id="activity-date"
                type="date"
                className={cn(sacramentFormControlClass, "mt-1")}
                value={form.activityDate}
                onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="activity-category">
                {formT(lang, { en: "Category", es: "Categoría" })}
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => {
                  if (v) setForm((f) => ({ ...f, category: v as WardActivityCategory }));
                }}
              >
                <SelectTrigger id="activity-category" className={cn(sacramentFormControlClass, "mt-1 w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WARD_ACTIVITY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {wardActivityCategoryLabel(cat, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="activity-title">
              {formT(lang, { en: "Title", es: "Título" })}
            </Label>
            <Input
              id="activity-title"
              className={cn(sacramentFormControlClass, "mt-1")}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={formT(lang, {
                en: "e.g. Ward picnic, youth temple trip",
                es: "p. ej. Picnic del barrio, excursión al templo",
              })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="activity-start">
                {formT(lang, { en: "Start time", es: "Hora de inicio" })}
              </Label>
              <TimePickerField
                id="activity-start"
                lang={lang}
                value={form.startTime}
                onChange={(startTime) => setForm((f) => ({ ...f, startTime }))}
              />
            </div>
            <div>
              <Label htmlFor="activity-end">
                {formT(lang, { en: "End time", es: "Hora de fin" })}
              </Label>
              <TimePickerField
                id="activity-end"
                lang={lang}
                value={form.endTime}
                onChange={(endTime) => setForm((f) => ({ ...f, endTime }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="activity-location">
              {formT(lang, { en: "Location", es: "Lugar" })}
            </Label>
            <Input
              id="activity-location"
              className={cn(sacramentFormControlClass, "mt-1")}
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder={formT(lang, {
                en: "Chapel, cultural hall, park…",
                es: "Capilla, salón cultural, parque…",
              })}
            />
          </div>

          <div>
            <Label htmlFor="activity-organizer">
              {formT(lang, { en: "Organizer / contact", es: "Organizador / contacto" })}
            </Label>
            <div className="mt-1">
              <MemberSearchSelect
                id="activity-organizer-select"
                lang={lang}
                members={members}
                value={form.organizerMemberId}
                onChange={(id) => setForm((f) => ({ ...f, organizerMemberId: id }))}
                emptyLabel={formT(lang, { en: "Search member…", es: "Buscar miembro…" })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="activity-notes">
              {formT(lang, { en: "Notes", es: "Notas" })}
            </Label>
            <Textarea
              id="activity-notes"
              className={cn(sacramentFormControlClass, "mt-1 min-h-[88px]")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={formT(lang, {
                en: "Details, what to bring, who is invited…",
                es: "Detalles, qué traer, quién está invitado…",
              })}
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.includeInSacramentProgram}
                onChange={(e) =>
                  setForm((f) => ({ ...f, includeInSacramentProgram: e.target.checked }))
                }
                className="mt-0.5 size-4 rounded border-border accent-foreground"
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  {formT(lang, {
                    en: "Include in sacrament program announcements",
                    es: "Incluir en anuncios del programa sacramental",
                  })}
                </span>
                <span className="mt-0.5 block text-foreground/60">
                  {formT(lang, {
                    en: "Adds this activity as an announcement on sacrament meetings before the event.",
                    es: "Agrega esta actividad como anuncio en las reuniones sacramentales antes del evento.",
                  })}
                </span>
              </span>
            </label>

            {form.includeInSacramentProgram ? (
              <div className="space-y-3 border-t border-border/60 pt-3">
                <div>
                  <Label htmlFor="announcement-weeks-before">
                    {formT(lang, {
                      en: "Announce how many weeks in advance?",
                      es: "¿Con cuántas semanas de anticipación?",
                    })}
                  </Label>
                  <Select
                    value={String(form.announcementWeeksBefore)}
                    onValueChange={(v) => {
                      if (v) {
                        setForm((f) => ({
                          ...f,
                          announcementWeeksBefore: Number(v) as AnnouncementWeeksBefore,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger
                      id="announcement-weeks-before"
                      className={cn(sacramentFormControlClass, "mt-1 w-full")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_WEEKS_BEFORE_OPTIONS.map((weeks) => (
                        <SelectItem key={weeks} value={String(weeks)}>
                          {announcementWeeksBeforeLabel(weeks, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {announcementWeeks.length > 0 ? (
                    <p className="mt-1.5 text-xs text-foreground/55">
                      {formT(lang, {
                        en: "Will appear on sacrament meetings:",
                        es: "Aparecerá en reuniones sacramentales:",
                      })}{" "}
                      {announcementWeeks.map((w) => formatSacramentWeekShort(w, lang)).join(" · ")}
                    </p>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={customAnnouncement}
                    onChange={(e) => setCustomAnnouncement(e.target.checked)}
                    className="size-4 rounded border-border accent-foreground"
                  />
                  {formT(lang, {
                    en: "Customize announcement text",
                    es: "Personalizar texto del anuncio",
                  })}
                </label>
                {customAnnouncement ? (
                  <Textarea
                    className={cn(sacramentFormControlClass, "min-h-[72px]")}
                    value={form.announcementText}
                    onChange={(e) => setForm((f) => ({ ...f, announcementText: e.target.value }))}
                    placeholder={previewAnnouncement}
                  />
                ) : (
                  <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground/80">
                    {previewAnnouncement}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            {formT(lang, { en: "Cancel", es: "Cancelar" })}
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={busy}>
            {busy
              ? formT(lang, { en: "Saving…", es: "Guardando…" })
              : formT(lang, { en: "Save activity", es: "Guardar actividad" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
