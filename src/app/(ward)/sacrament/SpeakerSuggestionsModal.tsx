"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SacramentFormLang } from "@/lib/sacramentProgram";
import type { SpeakerTalkSuggestion } from "./loadSacramentState";

function formT(lang: SacramentFormLang, b: { en: string; es: string }): string {
  return lang === "es" ? b.es : b.en;
}

function formatLastTalkDate(iso: string | null, lang: SacramentFormLang): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(lang === "es" ? "es" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function SpeakerSuggestionsModal({
  open,
  onClose,
  lang,
  suggestions,
  assignedMemberIds,
  canAddMore,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  lang: SacramentFormLang;
  suggestions: SpeakerTalkSuggestion[];
  assignedMemberIds: Set<string>;
  canAddMore: boolean;
  onAdd: (memberId: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="flex max-h-[min(90vh,720px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle>
            {formT(lang, { en: "Speaker suggestions", es: "Sugerencias de discursantes" })}
          </DialogTitle>
          <DialogDescription>
            {formT(lang, {
              en: "Members who have spoken before. Add one directly to a discourse slot.",
              es: "Miembros que ya han discursado. Agréguelos directamente a un discurso.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto">
          {suggestions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-foreground/55">
              {formT(lang, {
                en: "No prior speakers to suggest yet.",
                es: "Aún no hay discursantes previos para sugerir.",
              })}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-popover">
                <tr className="border-b border-border text-foreground/60">
                  <th className="px-4 py-2.5 font-medium">
                    {formT(lang, { en: "Member", es: "Miembro" })}
                  </th>
                  <th className="px-4 py-2.5 font-medium">
                    {formT(lang, { en: "Last talk", es: "Último discurso" })}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    {formT(lang, { en: "Action", es: "Acción" })}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suggestions.map((s) => {
                  const alreadyAssigned = assignedMemberIds.has(s.memberId);
                  const disabled = alreadyAssigned || !canAddMore;
                  return (
                    <tr key={s.memberId} className="align-middle">
                      <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-2.5 text-foreground/70">
                        {formatLastTalkDate(s.lastTalkDate, lang)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {alreadyAssigned ? (
                          <span className="text-xs text-foreground/50">
                            {formT(lang, { en: "Added", es: "Agregado" })}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled}
                            title={
                              !canAddMore
                                ? formT(lang, {
                                    en: "All discourse slots are full",
                                    es: "Todos los espacios de discurso están ocupados",
                                  })
                                : undefined
                            }
                            onClick={() => onAdd(s.memberId)}
                          >
                            {formT(lang, { en: "Add", es: "Agregar" })}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
