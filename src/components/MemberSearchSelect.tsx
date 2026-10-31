"use client";

import { AddMemberForm } from "@/app/(ward)/members/AddMemberForm";
import {
  sacramentPaperModalHeaderClass,
  sacramentPaperOverlayAttrs,
  sacramentPaperOverlayClass,
} from "@/app/(ward)/sacrament/SacramentSection";
import { formControlClassName } from "@/lib/formControlStyles";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export type MemberSearchAddMember = {
  wardId: string;
  callingOptions?: { id: string; title: string }[];
  /** Called after the member is created so parents can append to their lists. */
  onCreated: (member: { id: string; name: string }) => void;
};

export function MemberSearchSelect({
  id,
  value,
  onChange,
  members,
  lang,
  disabled,
  className,
  emptyLabel,
  addMember,
  paper = false,
}: {
  id: string;
  value: string | null;
  onChange: (memberId: string | null) => void;
  members: MemberOption[];
  lang: "en" | "es";
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  /** Built-in “add new member” dialog + footer row. */
  addMember?: MemberSearchAddMember;
  /** Ink-on-white menu (portaled; matches sacrament paper sheet). */
  paper?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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
    <>
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
          {...(paper ? sacramentPaperOverlayAttrs : {})}
          className={cn(
            "w-(--anchor-width) min-w-(--anchor-width) gap-0 overflow-hidden p-0 shadow-lg ring-0",
            paper ? sacramentPaperOverlayClass : "rounded-lg",
          )}
          align="start"
          initialFocus={false}
        >
          <Command
            shouldFilter={false}
            className={cn(
              "bg-transparent p-0",
              paper ? "rounded-none" : "rounded-lg",
              "[&_[data-slot=command-input-wrapper]]:border-b [&_[data-slot=command-input-wrapper]]:border-border/60 [&_[data-slot=command-input-wrapper]]:p-1.5",
              "[&_[data-slot=input-group]]:h-9! [&_[data-slot=input-group]]:border-0 [&_[data-slot=input-group]]:bg-muted/50 [&_[data-slot=input-group]]:shadow-none!",
              paper
                ? "[&_[data-slot=input-group]]:rounded-none!"
                : "[&_[data-slot=input-group]]:rounded-md!",
            )}
          >
            <CommandInput
              ref={inputRef}
              placeholder={t(lang, "Search by name…", "Buscar por nombre…")}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList ref={listRef} className="p-1">
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
              {addMember ? (
                <CommandItem
                  value="__add_member__"
                  onSelect={() => {
                    close();
                    // Defer so the member popover finishes closing before the add dialog opens.
                    queueMicrotask(() => setAddOpen(true));
                  }}
                  className="border-t border-border text-foreground/80"
                >
                  {t(lang, "+ Add new member…", "+ Agregar miembro…")}
                </CommandItem>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {addMember ? (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent
            {...(paper ? sacramentPaperOverlayAttrs : {})}
            align={paper ? "paper" : "page"}
            positionerClassName="z-[110]"
            className={cn(
              "z-[110] flex max-h-[min(90vh,720px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-y-auto p-0 sm:max-w-md",
              paper && sacramentPaperOverlayClass,
            )}
            overlayClassName="z-[110]"
          >
            <DialogHeader
              className={
                paper ? sacramentPaperModalHeaderClass : "space-y-1.5 px-6 py-5 pr-14"
              }
            >
              <DialogTitle>
                {t(lang, "Add member", "Agregar miembro")}
              </DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <AddMemberForm
                wardId={addMember.wardId}
                callingOptions={addMember.callingOptions ?? []}
                onSuccess={(member) => {
                  addMember.onCreated(member);
                  onChange(member.id);
                  setAddOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
