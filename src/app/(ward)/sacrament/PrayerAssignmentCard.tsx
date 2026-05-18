"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import type { SacramentFormLang, TalkResponseStatus } from "@/lib/sacramentProgram";
import { useEffect, useState } from "react";

const SELECT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-sm leading-10 text-foreground disabled:opacity-50";
const NOTE_INPUT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-50";

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

function FieldLabel({ lang, en, es }: { lang: SacramentFormLang; en: string; es: string }) {
  return <span className="mb-1 block font-medium text-foreground">{t(lang, en, es)}</span>;
}

function PencilIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function prayerRecorded(fulfilled: boolean | null) {
  return fulfilled === true || fulfilled === false;
}

export function PrayerAssignmentCard({
  variant,
  lang,
  members,
  memberId,
  memberName,
  responseStatus,
  responseNote,
  fulfilled,
  onMemberChange,
  onResponseChange,
  onNoteChange,
  onFulfilledChange,
}: {
  variant: "opening" | "closing";
  lang: SacramentFormLang;
  members: { id: string; name: string }[];
  memberId: string | null;
  memberName: string | null;
  responseStatus: TalkResponseStatus;
  responseNote: string | null;
  fulfilled: boolean | null;
  onMemberChange: (memberId: string | null) => void;
  onResponseChange: (status: TalkResponseStatus) => void;
  onNoteChange: (note: string | null) => void;
  onFulfilledChange: (fulfilled: boolean | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const recorded = prayerRecorded(fulfilled);
  const showCompact = recorded && !expanded;
  const hasMember = Boolean(memberId);
  const selectId = variant === "opening" ? "openPray" : "closePray";
  const labelEn = variant === "opening" ? "Opening prayer" : "Closing prayer";
  const labelEs = variant === "opening" ? "Primera oración" : "Última oración";

  useEffect(() => {
    if (recorded) setExpanded(false);
  }, [recorded, fulfilled]);

  const handleMemberChange = (nextId: string | null) => {
    if (nextId !== memberId) {
      onResponseChange("pending");
      onNoteChange(null);
      onFulfilledChange(null);
    }
    onMemberChange(nextId);
  };

  return (
    <div>
      <FieldLabel lang={lang} en={labelEn} es={labelEs} />
      {showCompact ? (
        <div
          className={`group rounded-lg border px-3 py-2.5 ${
            fulfilled ? "border-green-500/25 bg-green-500/5" : "border-amber-500/25 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {memberName ?? t(lang, "Unassigned", "Sin asignar")}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/80 text-foreground/70 opacity-0 transition-opacity hover:bg-surface-hover hover:text-foreground group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                onClick={() => setExpanded(true)}
                aria-label={t(lang, "Edit", "Editar")}
                title={t(lang, "Edit", "Editar")}
              >
                <PencilIcon />
              </button>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  fulfilled
                    ? "bg-green-600/15 text-green-800 dark:text-green-300"
                    : "bg-amber-600/15 text-amber-900 dark:text-amber-200"
                }`}
              >
                {fulfilled ? t(lang, "Prayed", "Oró") : t(lang, "Did not pray", "No oró")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-surface p-3">
          <div>
            <MemberSearchSelect
              id={selectId}
              lang={lang}
              members={members}
              value={memberId}
              onChange={handleMemberChange}
            />
          </div>

          {hasMember ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {t(lang, "Assignment (Members tab)", "Asignación (Miembros)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel lang={lang} en="Response" es="Respuesta" />
                  <select
                    id={`${selectId}-res`}
                    className={SELECT_CLASS}
                    value={responseStatus}
                    onChange={(e) => onResponseChange(e.target.value as TalkResponseStatus)}
                  >
                    <option value="pending">{t(lang, "Pending", "Pendiente")}</option>
                    <option value="accepted">{t(lang, "Accepted", "Aceptó")}</option>
                    <option value="declined">{t(lang, "Declined", "Declinó")}</option>
                  </select>
                </div>
                <div>
                  <FieldLabel lang={lang} en="Note (if declined)" es="Nota (si declinó)" />
                  <input
                    type="text"
                    className={NOTE_INPUT_CLASS}
                    value={responseNote ?? ""}
                    onChange={(e) => onNoteChange(e.target.value || null)}
                  />
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel lang={lang} en="Prayed that Sunday?" es="¿Oró ese domingo?" />
                <div className="mt-1 flex flex-wrap gap-2">
                  {(
                    [
                      { value: null, en: "Unknown", es: "Desconocido" },
                      { value: true, en: "Yes", es: "Sí" },
                      { value: false, en: "No", es: "No" },
                    ] as const
                  ).map((opt) => {
                    const active = fulfilled === opt.value;
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                          active
                            ? opt.value === true
                              ? "border-green-600/40 bg-green-600/10 font-medium text-green-900 dark:text-green-200"
                              : opt.value === false
                                ? "border-amber-600/40 bg-amber-600/10 font-medium text-amber-900 dark:text-amber-200"
                                : "border-foreground/30 bg-foreground/5 font-medium"
                            : "border-border text-foreground/70 hover:bg-surface-hover"
                        }`}
                        onClick={() => onFulfilledChange(opt.value)}
                      >
                        {t(lang, opt.en, opt.es)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {recorded ? (
            <button
              type="button"
              className="text-xs text-foreground/50 hover:text-foreground"
              onClick={() => setExpanded(false)}
            >
              {t(lang, "Done editing", "Listo")}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
