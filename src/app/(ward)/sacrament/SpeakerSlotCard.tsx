"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import {
  isGuestSpeakerSlot,
  type SacramentFormLang,
  type SpeakerSlot,
  type TalkResponseStatus,
} from "@/lib/sacramentProgram";
import { useEffect, useState } from "react";

const SELECT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-sm leading-10 text-foreground disabled:opacity-50";
const NOTE_INPUT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none disabled:opacity-50";
const TEXT_INPUT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none";

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

function FieldLabel({ lang, en, es }: { lang: SacramentFormLang; en: string; es: string }) {
  return <span className="mb-1 block font-medium text-foreground">{t(lang, en, es)}</span>;
}

function deliveryRecorded(slot: SpeakerSlot) {
  return slot.fulfilled === true || slot.fulfilled === false;
}

function responseSummary(lang: SacramentFormLang, status: TalkResponseStatus | undefined) {
  if (status === "accepted") return t(lang, "Accepted", "Aceptó");
  if (status === "declined") return t(lang, "Declined", "Declinó");
  return t(lang, "Pending", "Pendiente");
}

function speakerLabel(slot: SpeakerSlot, memberName: string | null, lang: SacramentFormLang) {
  const guest = slot.guest_name?.trim();
  if (guest) return guest;
  if (memberName) return memberName;
  return t(lang, "Unassigned", "Sin asignar");
}

export function SpeakerSlotCard({
  slot,
  lang,
  members,
  memberName,
  canRemove,
  onRemove,
  onChange,
}: {
  slot: SpeakerSlot;
  lang: SacramentFormLang;
  members: { id: string; name: string }[];
  memberName: string | null;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (next: SpeakerSlot) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const guestMode = isGuestSpeakerSlot(slot);
  const recorded = deliveryRecorded(slot);
  const showCompact = recorded && !expanded;
  const hasSpeaker = Boolean(slot.member_id || slot.guest_name?.trim());

  useEffect(() => {
    if (recorded) setExpanded(false);
  }, [recorded, slot.fulfilled]);

  const patch = (partial: Partial<SpeakerSlot>) => onChange({ ...slot, ...partial });

  const setWardMode = () => {
    onChange({
      ...slot,
      guest_name: null,
      member_id: slot.member_id,
    });
  };

  const setGuestMode = () => {
    onChange({
      ...slot,
      member_id: null,
      guest_name: slot.guest_name ?? "",
      response_status: "pending",
      response_note: null,
      fulfilled: null,
    });
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-medium text-foreground/55">
          {t(lang, `Speaker ${slot.position}`, `Discurso ${slot.position}`)}
        </p>
        {canRemove ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-surface-hover"
            onClick={onRemove}
          >
            {t(lang, "Remove", "Quitar")}
          </button>
        ) : null}
      </div>

      {showCompact ? (
        <div
          className={`mt-2 rounded-lg border px-3 py-2.5 ${
            slot.fulfilled
              ? "border-green-500/25 bg-green-500/5"
              : "border-amber-500/25 bg-amber-500/5"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {speakerLabel(slot, memberName, lang)}
              </p>
              {guestMode ? (
                <p className="mt-0.5 text-xs text-foreground/50">
                  {t(lang, "Guest / stake speaker", "Invitado / estaca")}
                </p>
              ) : null}
              {slot.topic?.trim() ? (
                <p className="mt-0.5 truncate text-sm text-foreground/60">
                  {t(lang, "Topic", "Tema")}: {slot.topic.trim()}
                </p>
              ) : null}
              {!guestMode ? (
                <p className="mt-1 text-xs text-foreground/50">
                  {t(lang, "Response", "Respuesta")}: {responseSummary(lang, slot.response_status)}
                  {slot.response_note?.trim() ? ` · ${slot.response_note.trim()}` : null}
                </p>
              ) : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                slot.fulfilled
                  ? "bg-green-600/15 text-green-800 dark:text-green-300"
                  : "bg-amber-600/15 text-amber-900 dark:text-amber-200"
              }`}
            >
              {slot.fulfilled
                ? t(lang, "Spoke", "Discursó")
                : t(lang, "Did not speak", "No discursó")}
            </span>
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-foreground/55 underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setExpanded(true)}
          >
            {t(lang, "Edit", "Editar")}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              {guestMode ? (
                <>
                  <FieldLabel lang={lang} en="Speaker" es="Orador" />
                  <input
                    type="text"
                    className={TEXT_INPUT_CLASS}
                    placeholder={t(lang, "e.g. Elder Smith — High Council", "p. ej. Élder López — Alto consejo")}
                    value={slot.guest_name ?? ""}
                    onChange={(e) => patch({ guest_name: e.target.value, member_id: null })}
                  />
                  <button
                    type="button"
                    className="mt-1.5 text-xs text-foreground/50 underline-offset-2 hover:text-foreground hover:underline"
                    onClick={setWardMode}
                  >
                    {t(lang, "Back to ward member", "Volver a miembro del barrio")}
                  </button>
                </>
              ) : (
                <>
                  <FieldLabel lang={lang} en="Member" es="Miembro" />
                  <MemberSearchSelect
                    id={`sp-${slot.position}`}
                    lang={lang}
                    members={members}
                    value={slot.member_id ?? null}
                    onChange={(memberId) => {
                      const prevMember = slot.member_id;
                      onChange({
                        ...slot,
                        member_id: memberId,
                        guest_name: null,
                        ...(prevMember !== memberId
                          ? {
                              response_status: "pending",
                              response_note: null,
                              fulfilled: null,
                            }
                          : {}),
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="mt-1.5 text-xs text-foreground/50 underline-offset-2 hover:text-foreground hover:underline"
                    onClick={setGuestMode}
                  >
                    {t(lang, "Guest or stake speaker instead", "Invitado o de la estaca")}
                  </button>
                </>
              )}
            </div>
            <div>
              <FieldLabel lang={lang} en="Topic (optional)" es="Tema (opcional)" />
              <input
                type="text"
                className={TEXT_INPUT_CLASS}
                value={slot.topic ?? ""}
                onChange={(e) => patch({ topic: e.target.value || null })}
              />
            </div>
          </div>

          {slot.member_id ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {t(lang, "Assignment (Members tab)", "Asignación (Miembros)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel lang={lang} en="Response" es="Respuesta" />
                  <select
                    id={`sp-res-${slot.position}`}
                    className={SELECT_CLASS}
                    value={slot.response_status ?? "pending"}
                    onChange={(e) =>
                      patch({ response_status: e.target.value as TalkResponseStatus })
                    }
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
                    value={slot.response_note ?? ""}
                    onChange={(e) => patch({ response_note: e.target.value || null })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {hasSpeaker ? (
            <div className={slot.member_id ? "mt-0" : "border-t border-border pt-3"}>
              <FieldLabel lang={lang} en="Spoke that Sunday?" es="¿Discursó ese domingo?" />
              <div className="mt-1 flex flex-wrap gap-2">
                {(
                  [
                    { value: null, en: "Unknown", es: "Desconocido" },
                    { value: true, en: "Yes", es: "Sí" },
                    { value: false, en: "No", es: "No" },
                  ] as const
                ).map((opt) => {
                  const active = slot.fulfilled === opt.value;
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
                      onClick={() => patch({ fulfilled: opt.value })}
                    >
                      {t(lang, opt.en, opt.es)}
                    </button>
                  );
                })}
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
