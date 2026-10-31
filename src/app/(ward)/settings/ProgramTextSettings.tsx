"use client";

import type { ProgramTemplatesMap } from "@/lib/sacrament/loadProgramTemplates";
import {
  PROGRAM_TEMPLATE_KEYS,
  type ProgramTemplateKey,
} from "@/lib/sacrament/programTemplates";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

const TEMPLATE_META: Record<ProgramTemplateKey, { label: string; description: string }> = {
  "ward.releases.default": {
    label: "Releases",
    description: "Spoken when releasing members from callings.",
  },
  "ward.sustainings.default": {
    label: "Sustainings",
    description: "Spoken when sustaining members to callings.",
  },
  "ward.new_members.default": {
    label: "New members",
    description: "Welcome vote when records move into the ward.",
  },
  "ward.ordination.deacon": {
    label: "Ordination — deacon",
    description: "Aaronic Priesthood ordination to deacon.",
  },
  "ward.ordination.teacher_priest": {
    label: "Ordination — teacher / priest",
    description: "Advancement to teacher or priest.",
  },
};

type TemplatesMap = ProgramTemplatesMap;

function emptyTemplates(): TemplatesMap {
  return {
    "ward.releases.default": { en: "", es: "" },
    "ward.sustainings.default": { en: "", es: "" },
    "ward.new_members.default": { en: "", es: "" },
    "ward.ordination.deacon": { en: "", es: "" },
    "ward.ordination.teacher_priest": { en: "", es: "" },
  };
}

export function ProgramTextSettings({
  wards,
  initialWardId,
  initialTemplates,
  initialDefaults,
}: {
  wards: { wardId: string; wardName: string }[];
  initialWardId: string;
  initialTemplates?: TemplatesMap;
  initialDefaults?: TemplatesMap;
}) {
  const [wardId, setWardId] = useState(initialWardId || wards[0]?.wardId || "");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [templates, setTemplates] = useState<TemplatesMap>(
    () => initialTemplates ?? emptyTemplates(),
  );
  const [defaults, setDefaults] = useState<TemplatesMap>(
    () => initialDefaults ?? emptyTemplates(),
  );
  const [loading, setLoading] = useState(!initialTemplates);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<ProgramTemplateKey | null>("ward.new_members.default");
  const cacheRef = useRef(
    (() => {
      const map = new Map<string, { templates: TemplatesMap; defaults: TemplatesMap }>();
      if (initialWardId && initialTemplates && initialDefaults) {
        map.set(initialWardId, { templates: initialTemplates, defaults: initialDefaults });
      }
      return map;
    })(),
  );

  const load = useCallback(async (id: string, opts?: { force?: boolean }) => {
    if (!id) return;
    setError(null);
    setMessage(null);

    if (!opts?.force) {
      const cached = cacheRef.current.get(id);
      if (cached) {
        setTemplates(cached.templates);
        setDefaults(cached.defaults);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sacrament/section-templates?wardId=${encodeURIComponent(id)}`);
      const data = (await res.json()) as {
        templates?: TemplatesMap;
        defaults?: TemplatesMap;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      const nextTemplates = data.templates ?? emptyTemplates();
      const nextDefaults = data.defaults ?? emptyTemplates();
      cacheRef.current.set(id, { templates: nextTemplates, defaults: nextDefaults });
      setTemplates(nextTemplates);
      setDefaults(nextDefaults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(wardId);
  }, [wardId, load]);

  const updateBody = (key: ProgramTemplateKey, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));
    setMessage(null);
  };

  const resetKey = (key: ProgramTemplateKey) => {
    setTemplates((prev) => ({
      ...prev,
      [key]: { ...prev[key], [lang]: defaults[key]?.[lang] ?? "" },
    }));
    setMessage(null);
  };

  const save = async () => {
    if (!wardId) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/sacrament/section-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wardId, templates }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setMessage("Saved for this ward. Other wards keep their own text.");
      cacheRef.current.delete(wardId);
      await load(wardId, { force: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (wards.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        Only bishopric and clerks can edit program text for a ward.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-foreground/60">
        Edit the spoken scripts used on the sacrament paper. Changes apply only to the selected
        ward; other wards keep the defaults.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        {wards.length > 1 ? (
          <label className="block min-w-[12rem] flex-1 text-sm">
            <span className="mb-1 block font-medium text-foreground">Ward</span>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
            >
              {wards.map((w) => (
                <option key={w.wardId} value={w.wardId}>
                  {w.wardName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm font-medium text-foreground">{wards[0]?.wardName}</p>
        )}

        <div
          className="inline-flex rounded-lg border border-border bg-background p-0.5"
          role="group"
          aria-label="Language"
        >
          {(["es", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium uppercase transition",
                lang === l
                  ? "bg-muted text-foreground"
                  : "text-foreground/60 hover:text-foreground",
              )}
            >
              {l === "es" ? "Español" : "English"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-foreground/60">Loading…</p>
      ) : (
        <div className="space-y-2">
          {PROGRAM_TEMPLATE_KEYS.map((key) => {
            const meta = TEMPLATE_META[key];
            const open = openKey === key;
            const value = templates[key]?.[lang] ?? "";
            const isCustom =
              (templates[key]?.[lang] ?? "").trim() !== (defaults[key]?.[lang] ?? "").trim();

            return (
              <div
                key={key}
                className="overflow-hidden rounded-xl border border-border bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setOpenKey(open ? null : key)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40"
                  aria-expanded={open}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{meta.label}</span>
                    <span className="mt-0.5 block text-xs text-foreground/55">{meta.description}</span>
                  </span>
                  {isCustom ? (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground/70">
                      Custom
                    </span>
                  ) : null}
                  <svg
                    className={cn(
                      "size-4 shrink-0 text-foreground/50 transition",
                      open && "rotate-180",
                    )}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {open ? (
                  <div className="space-y-3 border-t border-border px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/45">
                      Texto del programa
                    </p>
                    <textarea
                      value={value}
                      onChange={(e) => updateBody(key, e.target.value)}
                      rows={6}
                      className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-serif text-sm leading-relaxed text-foreground outline-none focus:border-foreground/30"
                      spellCheck
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => resetKey(key)}
                        className="text-xs text-foreground/55 underline-offset-2 hover:text-foreground hover:underline"
                      >
                        Reset to default ({lang === "es" ? "ES" : "EN"})
                      </button>
                      <p className="text-[11px] text-foreground/45">
                        Placeholders like [Nombre] stay in the text.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-foreground/70">{message}</p> : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || loading || !wardId}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save program text"}
        </button>
      </div>
    </div>
  );
}
