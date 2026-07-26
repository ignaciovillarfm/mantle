"use client";

import { formControlClassName } from "@/lib/formControlStyles";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { filterMembersByQuery, type MemberOption } from "@/lib/members/memberSearch";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

function t(lang: "en" | "es", en: string, es: string) {
  return lang === "es" ? es : en;
}

/** Scroll only within `container`, never the document (cmdk uses scrollIntoView). */
function scrollChildIntoContainer(child: HTMLElement, container: HTMLElement) {
  const cRect = container.getBoundingClientRect();
  const iRect = child.getBoundingClientRect();
  if (iRect.bottom > cRect.bottom) {
    container.scrollTop += iRect.bottom - cRect.bottom;
  } else if (iRect.top < cRect.top) {
    container.scrollTop -= cRect.top - iRect.top;
  }
}

export function MemberSearchSelect({
  id,
  value,
  onChange,
  members,
  lang,
  disabled,
  className,
  emptyLabel,
  footerAction,
}: {
  id: string;
  value: string | null;
  onChange: (memberId: string | null) => void;
  members: MemberOption[];
  lang: "en" | "es";
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  /** Extra command row (e.g. add member) shown below the member list. */
  footerAction?: { label: string; onSelect: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const nameById = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);
  const displayLabel = value
    ? (nameById.get(value) ?? "—")
    : (emptyLabel ?? t(lang, "— Select member —", "— Elegir miembro —"));

  const filtered = useMemo(() => filterMembersByQuery(members, search), [members, search]);

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

  // Keep page scroll stable when opening: Base UI / cmdk otherwise scroll the focused
  // search input or selected item into the middle of the viewport.
  useLayoutEffect(() => {
    if (!open) return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const restoreScroll = () => {
      if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
        window.scrollTo(scrollX, scrollY);
      }
    };

    inputRef.current?.focus({ preventScroll: true });
    restoreScroll();

    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function scrollIntoViewPatched(
      this: Element,
      arg?: boolean | ScrollIntoViewOptions,
    ) {
      const root =
        this instanceof Element
          ? this.closest("[data-member-search-select]")
          : null;
      if (root) {
        const list =
          listRef.current ??
          (root.querySelector("[data-slot=command-list]") as HTMLElement | null);
        if (list && this instanceof HTMLElement) {
          scrollChildIntoContainer(this, list);
        }
        restoreScroll();
        return;
      }
      return originalScrollIntoView.call(this, arg as boolean & ScrollIntoViewOptions);
    };

    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
      restoreScroll();
    });

    return () => {
      cancelAnimationFrame(raf);
      Element.prototype.scrollIntoView = originalScrollIntoView;
    };
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger
        id={id}
        disabled={disabled}
        className={cn(
          formControlClassName,
          "mt-1 flex h-10 w-full cursor-pointer items-center justify-between gap-2 border-solid px-3 py-0 font-normal",
          "data-popup-open:border-primary data-popup-open:shadow-[var(--shadow-focus)]",
          !value && "text-[var(--placeholder)]",
          className,
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDownIcon className="size-4 shrink-0 text-text-secondary" />
      </PopoverTrigger>
      <PopoverContent
        data-member-search-select=""
        className="w-[min(100vw-2rem,24rem)] p-0"
        align="start"
        initialFocus={false}
      >
        <Command shouldFilter={false}>
          <CommandInput
            ref={inputRef}
            placeholder={t(lang, "Search by name…", "Buscar por nombre…")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>
              {t(lang, "No members match your search.", "Ningún miembro coincide con la búsqueda.")}
            </CommandEmpty>
            <CommandItem
              value="__none__"
              onSelect={() => select(null)}
            >
              {t(lang, "— None —", "— Ninguno —")}
              {!value ? <CheckIcon className="ml-auto size-4" /> : null}
            </CommandItem>
            {filtered.map((m) => (
              <CommandItem
                key={m.id}
                value={`${m.name} ${m.id}`}
                onSelect={() => select(m.id)}
              >
                <span className="truncate">{m.name}</span>
                {value === m.id ? <CheckIcon className="ml-auto size-4" /> : null}
              </CommandItem>
            ))}
            {footerAction ? (
              <CommandItem
                value="__footer_action__"
                onSelect={() => {
                  close();
                  // Defer so the member popover finishes closing before a nested modal opens.
                  queueMicrotask(() => footerAction.onSelect());
                }}
                className="border-t border-border text-foreground/80"
              >
                {footerAction.label}
              </CommandItem>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
