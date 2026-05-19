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
import type { SacramentFormLang, TalkResponseStatus } from "@/lib/sacramentProgram";
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
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
                onClick={() => setExpanded(true)}
                aria-label={t(lang, "Edit", "Editar")}
                title={t(lang, "Edit", "Editar")}
              >
                <PencilIcon />
              </Button>
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
        <div className="space-y-3">
          <MemberSearchSelect
            id={selectId}
            lang={lang}
            members={members}
            value={memberId}
            onChange={handleMemberChange}
          />

          {hasMember ? (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
                {t(lang, "Assignment (Members tab)", "Asignación (Miembros)")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel lang={lang} en="Response" es="Respuesta" />
                  <Select
                    value={responseStatus}
                    onValueChange={(v) => {
                      if (v) onResponseChange(v as TalkResponseStatus);
                    }}
                  >
                    <SelectTrigger id={`${selectId}-res`} className="mt-1 w-full">
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
                    value={responseNote ?? ""}
                    onChange={(e) => onNoteChange(e.target.value || null)}
                  />
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel lang={lang} en="Prayed that Sunday?" es="¿Oró ese domingo?" />
                <ToggleGroup
                  variant="outline"
                  className="mt-1 flex flex-wrap justify-start gap-1"
                  value={[fulfilled === null ? "unknown" : fulfilled ? "yes" : "no"]}
                  onValueChange={(v) => {
                    const next = v[0];
                    if (!next) return;
                    onFulfilledChange(next === "unknown" ? null : next === "yes");
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
