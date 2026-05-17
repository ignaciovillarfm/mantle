"use client";

import { MemberSearchPanel } from "@/components/MemberSearchPanel";
import type { MemberOption } from "@/lib/members/memberSearch";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

function t(lang: "en" | "es", en: string, es: string) {
  return lang === "es" ? es : en;
}

const DEFAULT_TRIGGER_CLASS =
  "mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm text-foreground disabled:opacity-50";

export function MemberSearchSelect({
  id,
  value,
  onChange,
  members,
  lang,
  disabled,
  className,
  emptyLabel,
}: {
  id: string;
  value: string | null;
  onChange: (memberId: string | null) => void;
  members: MemberOption[];
  lang: "en" | "es";
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const nameById = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const displayLabel = value ? (nameById.get(value) ?? "—") : (emptyLabel ?? t(lang, "— Select member —", "— Elegir miembro —"));

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const select = useCallback(
    (memberId: string | null) => {
      onChange(memberId);
      close();
    },
    [close, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [close, open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        className={className ?? DEFAULT_TRIGGER_CLASS}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        <span className={value ? "truncate" : "truncate text-foreground/55"}>{displayLabel}</span>
        <span className="shrink-0 text-foreground/40" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-border bg-surface shadow-lg"
          id={listboxId}
        >
          <MemberSearchPanel
            lang={lang}
            members={members}
            selectedId={value}
            onSelect={select}
            search={search}
            onSearchChange={setSearch}
            autoFocusSearch
          />
        </div>
      ) : null}
    </div>
  );
}
