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
import { useCallback, useMemo, useState } from "react";

function t(lang: "en" | "es", en: string, es: string) {
  return lang === "es" ? es : en;
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
      <PopoverContent className="w-[min(100vw-2rem,24rem)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t(lang, "Search by name…", "Buscar por nombre…")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
