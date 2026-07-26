"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ClockIcon } from "lucide-react";
import { useMemo } from "react";

type FormLang = "en" | "es";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function parseTime24(value: string | null | undefined): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} | null {
  if (!value?.trim()) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  const snappedMinute = MINUTES.reduce((prev, curr) =>
    Math.abs(curr - minute) < Math.abs(prev - minute) ? curr : prev,
  );

  return { hour12, minute: snappedMinute, period };
}

function toTime24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplay(value: string | null | undefined, lang: FormLang): string {
  const parsed = parseTime24(value);
  if (!parsed) return "";
  const d = new Date(2000, 0, 1, parsed.period === "PM" ? (parsed.hour12 % 12) + 12 : parsed.hour12 % 12, parsed.minute);
  const locale = lang === "es" ? "es-ES" : "en-US";
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
}

export function TimePickerField({
  id,
  value,
  onChange,
  lang = "es",
  className,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  lang?: FormLang;
  className?: string;
  disabled?: boolean;
}) {
  const parsed = useMemo(() => parseTime24(value), [value]);
  const hasValue = Boolean(parsed);

  const hour12 = parsed?.hour12 ?? 10;
  const minute = parsed?.minute ?? 0;
  const period = parsed?.period ?? "AM";

  function update(next: { hour12?: number; minute?: number; period?: "AM" | "PM" }) {
    const h = next.hour12 ?? hour12;
    const m = next.minute ?? minute;
    const p = next.period ?? period;
    onChange(toTime24(h, m, p));
  }

  const emptyLabel = lang === "es" ? "Sin hora" : "No time";

  return (
    <div
      className={cn(
        "mt-1 flex items-center gap-1.5 rounded-xl border border-input bg-input-bg px-2 py-1.5 shadow-sm transition-[border-color,box-shadow] hover:border-primary/50 focus-within:border-primary focus-within:shadow-[var(--shadow-focus)]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <ClockIcon className="ml-0.5 size-4 shrink-0 text-foreground/45" aria-hidden />

      <Select
        value={hasValue ? String(hour12) : ""}
        onValueChange={(v) => {
          if (v) update({ hour12: Number(v) });
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={lang === "es" ? "Hora" : "Hour"}
          className="h-8 min-w-[3.25rem] flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/50 focus-visible:bg-muted/50"
        >
          <SelectValue placeholder="--">{hasValue ? String(hour12).padStart(2, "0") : "--"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {HOURS.map((h) => (
            <SelectItem key={h} value={String(h)}>
              {String(h).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm font-medium text-foreground/50" aria-hidden>
        :
      </span>

      <Select
        value={hasValue ? String(minute) : ""}
        onValueChange={(v) => {
          if (v !== undefined && v !== "") update({ minute: Number(v) });
        }}
      >
        <SelectTrigger
          aria-label={lang === "es" ? "Minutos" : "Minutes"}
          className="h-8 min-w-[3.25rem] flex-1 border-0 bg-transparent px-1 shadow-none hover:bg-muted/50 focus-visible:bg-muted/50"
        >
          <SelectValue placeholder="--">{hasValue ? String(minute).padStart(2, "0") : "--"}</SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {String(m).padStart(2, "0")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={hasValue ? period : ""}
        onValueChange={(v) => {
          if (v === "AM" || v === "PM") update({ period: v });
        }}
      >
        <SelectTrigger
          aria-label={lang === "es" ? "AM/PM" : "AM/PM"}
          className="h-8 min-w-[3.5rem] border-0 bg-transparent px-1 shadow-none hover:bg-muted/50 focus-visible:bg-muted/50"
        >
          <SelectValue placeholder="--">{hasValue ? period : "--"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>

      {hasValue ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          aria-label={emptyLabel}
          title={emptyLabel}
        >
          ×
        </button>
      ) : null}

      {hasValue ? (
        <span className="sr-only">{formatDisplay(value, lang)}</span>
      ) : null}
    </div>
  );
}
