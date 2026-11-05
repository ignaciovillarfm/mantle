"use client";

import {
  MemberSearchSelect,
  type MemberSearchAddMember,
} from "@/components/MemberSearchSelect";
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
import { hoverRevealRemoveClassName } from "@/lib/hoverRevealRemove";
import {
  sacramentPaperOverlayAttrs,
  sacramentPaperOverlayClass,
} from "@/app/(ward)/sacrament/SacramentSection";
import {
  isGuestSpeakerSlot,
  type SacramentFormLang,
  type SpeakerSlot,
  type TalkResponseStatus,
} from "@/lib/sacramentProgram";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

function FieldLabel({ lang, en, es }: { lang: SacramentFormLang; en: string; es: string }) {
  return <Label className="mb-1.5 block text-sm font-medium text-foreground">{t(lang, en, es)}</Label>;
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

function spokeValue(fulfilled: boolean | null): "unknown" | "yes" | "no" {
  if (fulfilled === true) return "yes";
  if (fulfilled === false) return "no";
  return "unknown";
}

export function SpeakerSlotCard({
  slot,
  lang,
  members,
  memberName,
  canRemove,
  onRemove,
  onChange,
  addMember,
  controlClassName,
  paper,
}: {
  slot: SpeakerSlot;
  lang: SacramentFormLang;
  members: { id: string; name: string }[];
  memberName: string | null;
  canRemove: boolean;
  onRemove: () => void;
  onChange: (next: SpeakerSlot) => void;
  addMember?: MemberSearchAddMember;
  controlClassName?: string;
  paper?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const guestMode = isGuestSpeakerSlot(slot);
  const recorded = deliveryRecorded(slot);
  const showCompact = recorded && !expanded;
  const hasSpeaker = Boolean(slot.member_id || slot.guest_name?.trim());
  const didNotSpeak = slot.fulfilled === false;
  const showDetails = didNotSpeak || (slot.response_status ?? "pending") === "declined";
  const assignedName = speakerLabel(slot, memberName, lang);
  const showGuestLink = !guestMode && !slot.member_id;

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
    <div
      className={cn(
        "group",
        paper
          ? "border border-neutral-300 bg-neutral-50/50 px-4 py-4 sm:px-5 sm:py-5"
          : "rounded-xl border border-border bg-muted/20 px-4 py-4 sm:px-5 sm:py-5",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="min-w-0 font-medium text-foreground">
          {t(lang, slotLabelEn, slotLabelEs)}
          {hasSpeaker && !showCompact ? (
            <span className="font-normal text-foreground/50"> · {assignedName}</span>
          ) : null}
        </p>
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
              {assignedName}
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
                  ? t(lang, "Spoke", "Habló")
                  : t(lang, "Did not speak", "No habló")}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
            <div className="min-w-0">
              <FieldLabel lang={lang} en="Speaker" es="Orador" />
              {guestMode ? (
                <Input
                  className={cn("h-10", controlClassName)}
                  placeholder={t(
                    lang,
                    "e.g. Elder Smith — High Council",
                    "p. ej. Élder López — Alto consejo",
                  )}
                  value={slot.guest_name ?? ""}
                  onChange={(e) => patch({ guest_name: e.target.value, member_id: null })}
                />
              ) : (
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
                  addMember={addMember}
                  className={cn("mt-0", controlClassName)}
                  paper={paper}
                />
              )}
              {guestMode ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1.5 h-auto px-0 text-xs text-foreground/60"
                  onClick={setWardMode}
                >
                  {t(lang, "Back to ward member", "Volver a miembro del barrio")}
                </Button>
              ) : showGuestLink ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="mt-1.5 h-auto px-0 text-xs text-foreground/60"
                  onClick={setGuestMode}
                >
                  {t(lang, "Guest or stake speaker instead", "Invitado o de la estaca")}
                </Button>
              ) : null}
            </div>

            <div className="min-w-0">
              <FieldLabel lang={lang} en="Topic (optional)" es="Tema (opcional)" />
              <Input
                className={cn("h-10", controlClassName)}
                value={slot.topic ?? ""}
                onChange={(e) => patch({ topic: e.target.value || null })}
              />
            </div>

            {hasSpeaker && slot.member_id ? (
              <div className="min-w-0">
                <FieldLabel lang={lang} en="Response" es="Respuesta" />
                <Select
                  value={slot.response_status ?? "pending"}
                  items={{
                    pending: t(lang, "Pending", "Pendiente"),
                    accepted: t(lang, "Accepted", "Aceptó"),
                    declined: t(lang, "Declined", "Declinó"),
                  }}
                  onValueChange={(v) => {
                    if (!v) return;
                    const next = v as TalkResponseStatus;
                    patch({
                      response_status: next,
                      ...(next !== "declined" && !didNotSpeak ? { response_note: null } : {}),
                    });
                  }}
                >
                  <SelectTrigger
                    id={`sp-res-${slot.position}`}
                    className={cn("h-10 w-full", controlClassName)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    {...(paper ? sacramentPaperOverlayAttrs : {})}
                    className={cn(paper && sacramentPaperOverlayClass)}
                  >
                    <SelectItem value="pending">{t(lang, "Pending", "Pendiente")}</SelectItem>
                    <SelectItem value="accepted">{t(lang, "Accepted", "Aceptó")}</SelectItem>
                    <SelectItem value="declined">{t(lang, "Declined", "Declinó")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {hasSpeaker ? (
              <div className="min-w-0">
                <FieldLabel lang={lang} en="Spoke?" es="¿Habló?" />
                <Select
                  value={spokeValue(slot.fulfilled ?? null)}
                  items={{
                    unknown: t(lang, "Not yet", "Todavía no"),
                    yes: t(lang, "Yes", "Sí"),
                    no: t(lang, "No", "No"),
                  }}
                  onValueChange={(v) => {
                    if (!v) return;
                    const fulfilled = v === "unknown" ? null : v === "yes";
                    patch({
                      fulfilled,
                      ...(fulfilled !== false &&
                      (slot.response_status ?? "pending") !== "declined"
                        ? { response_note: null }
                        : {}),
                    });
                  }}
                >
                  <SelectTrigger
                    id={`sp-spoke-${slot.position}`}
                    className={cn("h-10 w-full", controlClassName)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    {...(paper ? sacramentPaperOverlayAttrs : {})}
                    className={cn(paper && sacramentPaperOverlayClass)}
                  >
                    <SelectItem value="unknown">{t(lang, "Not yet", "Todavía no")}</SelectItem>
                    <SelectItem value="yes">{t(lang, "Yes", "Sí")}</SelectItem>
                    <SelectItem value="no">{t(lang, "No", "No")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {hasSpeaker && showDetails ? (
              <div className="min-w-0 sm:col-span-2">
                <FieldLabel lang={lang} en="Additional details" es="Detalles adicionales" />
                <Input
                  className={cn("h-10", controlClassName)}
                  placeholder={t(lang, "Optional note…", "Nota opcional…")}
                  value={slot.response_note ?? ""}
                  onChange={(e) => patch({ response_note: e.target.value || null })}
                />
              </div>
            ) : null}
          </div>

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
