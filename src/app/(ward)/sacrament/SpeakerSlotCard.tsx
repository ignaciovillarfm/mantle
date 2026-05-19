"use client";

import { MemberSearchSelect } from "@/components/MemberSearchSelect";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { hoverRevealRemoveClassName } from "@/lib/hoverRevealRemove";
import {
  isGuestSpeakerSlot,
  type SacramentFormLang,
  type SpeakerSlot,
  type TalkResponseStatus,
} from "@/lib/sacramentProgram";
import { useEffect, useState } from "react";

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

function FieldLabel({ lang, en, es }: { lang: SacramentFormLang; en: string; es: string }) {
  return <Label className="mb-1 block font-medium text-foreground">{t(lang, en, es)}</Label>;
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

function deliveryRecorded(slot: SpeakerSlot) {
  return slot.fulfilled === true || slot.fulfilled === false;
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

  const slotLabelEn = `Speaker ${slot.position}`;
  const slotLabelEs = `Discurso ${slot.position}`;

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{t(lang, slotLabelEn, slotLabelEs)}</span>
        {canRemove && !showCompact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={`h-7 shrink-0 px-2 text-[11px] hover:bg-red-500/10 hover:text-red-600 ${hoverRevealRemoveClassName}`}
            onClick={onRemove}
          >
            {t(lang, "Remove", "Quitar")}
          </Button>
        ) : null}
      </div>

      {showCompact ? (
        <div
          className={`group rounded-lg border px-3 py-2.5 ${
            slot.fulfilled
              ? "border-green-500/25 bg-green-500/5"
              : "border-amber-500/25 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              {speakerLabel(slot, memberName, lang)}
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
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              {guestMode ? (
                <>
                  <FieldLabel lang={lang} en="Speaker" es="Orador" />
                  <Input
                    className="mt-1"
                    placeholder={t(lang, "e.g. Elder Smith — High Council", "p. ej. Élder López — Alto consejo")}
                    value={slot.guest_name ?? ""}
                    onChange={(e) => patch({ guest_name: e.target.value, member_id: null })}
                  />
                </>
              ) : (
                <MemberSearchSelect
                  id={`sp-${slot.position}`}
                  lang={lang}
                  members={members}
                  className="mt-0"
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
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Input
                placeholder={t(lang, "Topic (optional)", "Tema (opcional)")}
                value={slot.topic ?? ""}
                onChange={(e) => patch({ topic: e.target.value || null })}
              />
            </div>
          </div>

          {guestMode ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={setWardMode}
            >
              {t(lang, "Back to ward member", "Volver a miembro del barrio")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={setGuestMode}
            >
              {t(lang, "Guest or stake speaker instead", "Invitado o de la estaca")}
            </Button>
          )}

          {slot.member_id ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {t(lang, "Assignment (Members tab)", "Asignación (Miembros)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel lang={lang} en="Response" es="Respuesta" />
                  <Select
                    value={slot.response_status ?? "pending"}
                    onValueChange={(v) => {
                      if (v) patch({ response_status: v as TalkResponseStatus });
                    }}
                  >
                    <SelectTrigger id={`sp-res-${slot.position}`} className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t(lang, "Pending", "Pendiente")}</SelectItem>
                      <SelectItem value="accepted">{t(lang, "Accepted", "Aceptó")}</SelectItem>
                      <SelectItem value="declined">{t(lang, "Declined", "Declinó")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel lang={lang} en="Note (if declined)" es="Nota (si declinó)" />
                  <Input
                    className="mt-1"
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
              <ToggleGroup
                variant="outline"
                className="mt-1 flex flex-wrap justify-start gap-1"
                value={[slot.fulfilled === null ? "unknown" : slot.fulfilled ? "yes" : "no"]}
                onValueChange={(v) => {
                  const next = v[0];
                  if (!next) return;
                  patch({
                    fulfilled: next === "unknown" ? null : next === "yes",
                  });
                }}
              >
                <ToggleGroupItem value="unknown" className="text-sm">
                  {t(lang, "Unknown", "Desconocido")}
                </ToggleGroupItem>
                <ToggleGroupItem value="yes" className="text-sm">
                  {t(lang, "Yes", "Sí")}
                </ToggleGroupItem>
                <ToggleGroupItem value="no" className="text-sm">
                  {t(lang, "No", "No")}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          ) : null}

          {recorded ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs"
              onClick={() => setExpanded(false)}
            >
              {t(lang, "Done editing", "Listo")}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
