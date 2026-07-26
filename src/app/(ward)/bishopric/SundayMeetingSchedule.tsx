"use client";

import { sundayStripCellClassName } from "@/lib/formControlStyles";
import {
  formatMonthLabel,
  formatMonthYear,
  parseMonthYear,
  shiftMonth,
} from "@/lib/calendar/wardActivity";
import {
  formatLocalISODate,
  parseLocalDateFromISO,
  startOfWeekSundayFromISO,
} from "@/lib/sacramentProgram";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { SUNDAY_MEETING_SCHEDULE } from "./sundaySchedule";

function sundaysInMonth(month: string): string[] {
  const parsed = parseMonthYear(month);
  if (!parsed) return [];
  const { year, monthIndex } = parsed;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const out: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex, day);
    if (d.getDay() === 0) out.push(formatLocalISODate(d));
  }
  return out;
}

function formatSundayHeading(iso: string): string {
  const d = parseLocalDateFromISO(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
}

function formatSundayShort(iso: string): string {
  const d = parseLocalDateFromISO(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

export function SundayMeetingSchedule({ wardName }: { wardName: string }) {
  const todayIso = formatLocalISODate(new Date());
  const currentSundayIso = formatLocalISODate(startOfWeekSundayFromISO(todayIso));
  const [month, setMonth] = useState(() => formatMonthYear(new Date()));

  const sundays = useMemo(() => sundaysInMonth(month), [month]);
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Meetings</h1>
        <p className="text-sm text-foreground/60">
          Sundays this month with the fixed bishopric schedule.
        </p>
        <p className="text-xs text-foreground/45">{wardName}</p>
      </header>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-1 sm:gap-x-2">
        <button
          type="button"
          aria-label="Previous month"
          className={cn(
            sundayStripCellClassName,
            "flex h-14 w-9 items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
          )}
          onClick={() => setMonth(prevMonth)}
        >
          ‹
        </button>
        <div
          className={cn(
            sundayStripCellClassName,
            "flex h-14 min-w-0 items-center justify-center px-3 text-center text-base font-semibold capitalize leading-snug sm:h-16 sm:text-lg",
          )}
        >
          {formatMonthLabel(month, "en")}
        </div>
        <button
          type="button"
          aria-label="Next month"
          className={cn(
            sundayStripCellClassName,
            "flex h-14 w-9 items-center justify-center text-2xl font-semibold leading-none sm:h-16 sm:w-10",
          )}
          onClick={() => setMonth(nextMonth)}
        >
          ›
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sundays.map((sundayIso) => {
          const isCurrent = sundayIso === currentSundayIso;
          const isToday = sundayIso === todayIso;

          return (
            <article
              key={sundayIso}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
                isCurrent
                  ? "border-primary/50 ring-2 ring-primary/30"
                  : "border-border",
              )}
            >
              <div
                className={cn(
                  "border-b px-4 py-3",
                  isCurrent ? "border-primary/20 bg-primary/10" : "border-border bg-muted/25",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent ? "text-primary" : "text-foreground",
                      )}
                    >
                      {formatSundayHeading(sundayIso)}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">{formatSundayShort(sundayIso)}</p>
                  </div>
                  {isCurrent ? (
                    <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      {isToday ? "Today" : "This week"}
                    </span>
                  ) : null}
                </div>
              </div>

              <ol className="divide-y divide-border">
                {SUNDAY_MEETING_SCHEDULE.map((meeting) => (
                  <li key={meeting.id} className="flex gap-3 px-4 py-3">
                    <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {meeting.time}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{meeting.name}</p>
                      <p className="text-xs text-foreground/50">{meeting.nameEs}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          );
        })}
      </div>

      {sundays.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-foreground/55">
          No Sundays in this month.
        </p>
      ) : null}
    </div>
  );
}
