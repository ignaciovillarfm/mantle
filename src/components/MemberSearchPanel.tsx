"use client";

import { filterMembersByQuery, type MemberOption } from "@/lib/members/memberSearch";
import { useMemo, useId, type ReactNode } from "react";

function t(lang: "en" | "es", en: string, es: string) {
  return lang === "es" ? es : en;
}

export function MemberSearchInput({
  id,
  lang,
  value,
  onChange,
  autoFocus,
}: {
  id: string;
  lang: "en" | "es";
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {t(lang, "Search members", "Buscar miembros")}
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        autoFocus={autoFocus}
        placeholder={t(lang, "Search by name…", "Buscar por nombre…")}
        className="w-full rounded-lg border border-border bg-background py-2 pl-10 pr-3 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

export function MemberSearchList({
  lang,
  members,
  selectedId,
  onSelect,
  listId,
  emptyMessage,
  renderTrailing,
}: {
  lang: "en" | "es";
  members: MemberOption[];
  selectedId?: string | null;
  onSelect: (memberId: string | null) => void;
  listId: string;
  emptyMessage?: string;
  renderTrailing?: (member: MemberOption) => ReactNode;
}) {
  return (
    <ul
      id={listId}
      role="listbox"
      className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background"
    >
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={selectedId == null}
          className={`flex w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover ${
            selectedId == null ? "bg-surface-hover font-medium" : "text-foreground/60"
          }`}
          onClick={() => onSelect(null)}
        >
          {t(lang, "— None —", "— Ninguno —")}
        </button>
      </li>
      {members.length === 0 ? (
        <li className="px-3 py-3 text-sm text-foreground/50">
          {emptyMessage ?? t(lang, "No members match your search.", "Ningún miembro coincide con la búsqueda.")}
        </li>
      ) : (
        members.map((m) => {
          const isSelected = selectedId === m.id;
          return (
            <li key={m.id} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                  isSelected ? "bg-surface-hover font-medium" : ""
                }`}
                onClick={() => onSelect(m.id)}
              >
                <span>{m.name}</span>
                {renderTrailing ? renderTrailing(m) : null}
              </button>
            </li>
          );
        })
      )}
    </ul>
  );
}

export function MemberSearchPanel({
  lang,
  members,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  autoFocusSearch,
  emptyMessage,
  renderTrailing,
}: {
  lang: "en" | "es";
  members: MemberOption[];
  selectedId?: string | null;
  onSelect: (memberId: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
  autoFocusSearch?: boolean;
  emptyMessage?: string;
  renderTrailing?: (member: MemberOption) => ReactNode;
}) {
  const searchInputId = useId();
  const listId = useId();
  const filtered = useMemo(() => filterMembersByQuery(members, search), [members, search]);

  return (
    <div className="space-y-2 p-2">
      <MemberSearchInput
        id={searchInputId}
        lang={lang}
        value={search}
        onChange={onSearchChange}
        autoFocus={autoFocusSearch}
      />
      <MemberSearchList
        lang={lang}
        members={filtered}
        selectedId={selectedId}
        onSelect={onSelect}
        listId={listId}
        emptyMessage={emptyMessage}
        renderTrailing={renderTrailing}
      />
    </div>
  );
}
