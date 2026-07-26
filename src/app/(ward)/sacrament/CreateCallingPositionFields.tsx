"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CALLING_GROUP_ORDER,
  CALLING_GROUP_LABEL,
  type CallingGroupKey,
} from "@/lib/callings/groupCallingOptions";
import { PlusIcon } from "lucide-react";
import { useCallback, useState } from "react";

function t(lang: "en" | "es", en: string, es: string) {
  return lang === "es" ? es : en;
}

export function CreateCallingPositionFields({
  lang,
  wardId,
  onCreated,
}: {
  lang: "en" | "es";
  wardId: string;
  onCreated: (position: { id: string; title: string; groupKey: CallingGroupKey }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [groupKey, setGroupKey] = useState<CallingGroupKey>("primary");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || !wardId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/calling-positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ wardId, title: trimmed, groupKey }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; id?: string; title?: string };
      if (!res.ok || !json.ok || !json.id) {
        setError(typeof json.error === "string" ? json.error : `Save failed (${res.status})`);
        return;
      }
      onCreated({
        id: json.id,
        title: json.title ?? trimmed,
        groupKey,
      });
      setTitle("");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }, [groupKey, onCreated, title, wardId]);

  if (!open) {
    const label = t(lang, "New calling", "Nuevo cargo");
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-2.5"
        onClick={() => setOpen(true)}
        title={label}
      >
        <PlusIcon className="size-4" />
        <span className="sr-only sm:not-sr-only sm:inline">{label}</span>
      </Button>
    );
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="create-calling-group" className="sr-only">
            {t(lang, "Organization / group", "Organización / grupo")}
          </Label>
          <Select value={groupKey} onValueChange={(v) => v && setGroupKey(v as CallingGroupKey)}>
            <SelectTrigger id="create-calling-group" className="w-full">
              <SelectValue placeholder={t(lang, "Group…", "Grupo…")} />
            </SelectTrigger>
            <SelectContent>
              {CALLING_GROUP_ORDER.map((key) => (
                <SelectItem key={key} value={key}>
                  {CALLING_GROUP_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="create-calling-title" className="sr-only">
            {t(lang, "Calling title", "Nombre del llamamiento")}
          </Label>
          <Input
            id="create-calling-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t(lang, "Calling title…", "Nombre del cargo…")}
          />
        </div>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !title.trim()} onClick={() => void submit()}>
          {busy ? t(lang, "Saving…", "Guardando…") : t(lang, "Add", "Agregar")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError(null);
            setTitle("");
          }}
        >
          {t(lang, "Cancel", "Cancelar")}
        </Button>
      </div>
    </div>
  );
}
