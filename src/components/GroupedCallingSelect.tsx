"use client";

import { useMemo } from "react";
import { groupCallingOptions } from "@/lib/callings/groupCallingOptions";

/** Ward `calling_positions` list with English optgroup headers (same grouping as Add member). */
export function GroupedCallingSelect({
  id,
  value,
  onChange,
  options,
  emptyLabel,
  className = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm",
}: {
  id: string;
  value: string | null;
  onChange: (positionId: string | null) => void;
  options: { id: string; title: string }[];
  emptyLabel: string;
  className?: string;
}) {
  const grouped = useMemo(() => groupCallingOptions(options), [options]);

  return (
    <select
      id={id}
      className={className}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
    >
      <option value="">{emptyLabel}</option>
      {grouped.map((group) => (
        <optgroup key={group.key} label={group.label}>
          {group.options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
