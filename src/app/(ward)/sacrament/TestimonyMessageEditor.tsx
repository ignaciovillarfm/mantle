"use client";

import type { SacramentFormLang } from "@/lib/sacramentProgram";
import {
  formatTestimonyMessageLines,
  suggestTestimonyMessageId,
  TESTIMONY_MESSAGE_CUSTOM_ID,
  TESTIMONY_MESSAGES,
  testimonyIdsUsedWithinMonths,
  type TestimonyMessageUsage,
} from "@/lib/sacramentTestimonyMessages";
import { useCallback, useEffect, useRef } from "react";

const SELECT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-sm leading-10 text-foreground";
const TEXTAREA_CLASS =
  "mt-1 min-h-[88px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none";

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

function presetOptionLabel(
  lang: SacramentFormLang,
  id: string,
): string {
  const msg = TESTIMONY_MESSAGES.find((m) => m.id === id);
  if (!msg) return id;
  const quote = msg.quote[lang];
  const short = quote.length > 52 ? `${quote.slice(0, 49)}…` : quote;
  return `${msg.author[lang]}: “${short}”`;
}

export function TestimonyMessageEditor({
  lang,
  meetingDate,
  messageId,
  messageCustom,
  usage,
  onChange,
}: {
  lang: SacramentFormLang;
  meetingDate: string;
  messageId: string;
  messageCustom: string;
  usage: TestimonyMessageUsage[];
  onChange: (id: string, custom: string) => void;
}) {
  const autoSuggestedRef = useRef(false);
  const recentlyUsed = testimonyIdsUsedWithinMonths(usage, meetingDate, 2);
  const isCustom = messageId === TESTIMONY_MESSAGE_CUSTOM_ID;
  const preview = formatTestimonyMessageLines(
    { testimonyMessageId: messageId, testimonyMessageCustom: messageCustom },
    lang,
  );

  useEffect(() => {
    autoSuggestedRef.current = false;
  }, [meetingDate]);

  useEffect(() => {
    if (autoSuggestedRef.current || messageId) return;
    autoSuggestedRef.current = true;
    onChange(suggestTestimonyMessageId(usage, meetingDate), "");
  }, [messageId, meetingDate, onChange, usage]);

  const handleSuggest = useCallback(() => {
    onChange(suggestTestimonyMessageId(usage, meetingDate), "");
  }, [meetingDate, onChange, usage]);

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t(lang, "Message for the congregation", "Mensaje para la congregación")}
        </label>
        <p className="text-xs text-foreground/55">
          {t(
            lang,
            "Share a short quote or thought with the congregation. Messages used in the last two months are avoided when suggesting.",
            "Comparta una cita o pensamiento breve con la congregación. Al sugerir, se evitan mensajes usados en los últimos dos meses.",
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={`${SELECT_CLASS} min-w-[min(100%,20rem)] flex-1`}
          value={isCustom ? TESTIMONY_MESSAGE_CUSTOM_ID : messageId}
          onChange={(e) => {
            const next = e.target.value;
            if (next === TESTIMONY_MESSAGE_CUSTOM_ID) {
              onChange(TESTIMONY_MESSAGE_CUSTOM_ID, messageCustom);
            } else {
              onChange(next, "");
            }
          }}
        >
          <option value="">
            {t(lang, "Select a message…", "Seleccione un mensaje…")}
          </option>
          {TESTIMONY_MESSAGES.map((m) => (
            <option key={m.id} value={m.id} disabled={recentlyUsed.has(m.id) && m.id !== messageId}>
              {presetOptionLabel(lang, m.id)}
              {recentlyUsed.has(m.id) && m.id !== messageId
                ? t(lang, " (recent)", " (reciente)")
                : ""}
            </option>
          ))}
          <option value={TESTIMONY_MESSAGE_CUSTOM_ID}>
            {t(lang, "Custom text…", "Texto personalizado…")}
          </option>
        </select>
        <button
          type="button"
          className="h-10 shrink-0 rounded-lg border border-border px-3 text-sm hover:bg-surface-hover"
          onClick={handleSuggest}
        >
          {t(lang, "Suggest unused", "Sugerir sin repetir")}
        </button>
      </div>

      {isCustom ? (
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t(lang, "Custom message", "Mensaje personalizado")}
          </label>
          <textarea
            className={TEXTAREA_CLASS}
            value={messageCustom}
            onChange={(e) => onChange(TESTIMONY_MESSAGE_CUSTOM_ID, e.target.value)}
            placeholder={t(
              lang,
              "Write a short message for the congregation…",
              "Escriba un mensaje breve para la congregación…",
            )}
          />
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-lg border border-border/80 bg-background/40 px-3 py-2.5 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t(lang, "Preview", "Vista previa")}
          </p>
          {preview.attribution ? (
            <p className="mt-1 font-medium text-foreground">{preview.attribution}</p>
          ) : null}
          <p className={preview.attribution ? "mt-0.5 italic text-foreground/90" : "mt-1 text-foreground/90"}>
            “{preview.quote}”
          </p>
        </div>
      ) : null}
    </div>
  );
}
