import { combineWardBusinessEntries } from "@/lib/sacrament/combineWardBusinessEntries";
import {
  newMembersSectionDisplayEntries,
  otherSectionEntries,
  splitNewMembersTemplateBody,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
  type WardBusinessSection,
} from "@/lib/sacramentProgram";

export function sectionTemplateText(
  templateKey: string | undefined,
  templates: Record<string, { en?: string; es?: string }>,
  lang: SacramentFormLang,
): string {
  if (!templateKey) return "";
  const row = templates[templateKey];
  if (!row) return "";
  return (lang === "es" ? row.es : row.en) ?? "";
}

export function TwoColumnTable({ rows }: { rows: { left: string; right: string }[] }) {
  if (rows.length === 0) return null;
  return (
    <table className="w-full border border-black border-collapse text-[13px]">
      <tbody>
        {rows.map((row, i) => (
          <tr key={`nm-${i}`}>
            <td className="border border-black px-2.5 py-1">{row.left || "\u00A0"}</td>
            <td className="border border-black px-2.5 py-1">{row.right || "\u00A0"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FixedRowsTable({
  rows,
  showIndex = false,
  rightLabel,
}: {
  rows: string[];
  showIndex?: boolean;
  rightLabel?: string;
}) {
  return (
    <table className="w-full border border-black border-collapse text-[13px]">
      <tbody>
        {rows.map((row, i) => (
          <tr key={`r-${i}`}>
            {showIndex ? <td className="w-8 border border-black px-1 text-center">{i + 1}</td> : null}
            <td className="border border-black px-2.5 py-1">{row || "\u00A0"}</td>
            {rightLabel ? <td className="w-10 border border-black px-1 text-center">{rightLabel}</td> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function t(lang: SacramentFormLang, en: string, es: string) {
  return lang === "es" ? es : en;
}

export function WardBusinessPrintBody({
  sections,
  lang,
  sectionTemplates,
  memberNameById,
  callingById,
}: {
  sections: WardBusinessSection[];
  lang: SacramentFormLang;
  sectionTemplates: Record<string, { en?: string; es?: string }>;
  memberNameById: Map<string, string>;
  callingById: Map<string, string>;
}) {
  if (sections.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map((sec) => {
        const templateText =
          sec.kind === "aaron_priesthood_ordination"
            ? ""
            : sectionTemplateText(sec.templateKey, sectionTemplates, lang);
        const commonText = sec.kind === "new_members" ? templateText : templateText || sec.body || "";
        const deaconText = sectionTemplateText("ward.ordination.deacon", sectionTemplates, lang);
        const tpText = sectionTemplateText("ward.ordination.teacher_priest", sectionTemplates, lang);
        const newMembersTemplate =
          sec.kind === "new_members" ? splitNewMembersTemplateBody(templateText) : { before: "", after: "" };
        const newMembersRows =
          sec.kind === "new_members" ? newMembersSectionDisplayEntries(sec, lang) : [];
        const otherLines = sec.kind === "other" ? otherSectionEntries(sec) : [];
        const releaseRows =
          sec.kind === "releases"
            ? combineWardBusinessEntries(
                sec.releaseEntries ?? [],
                memberNameById,
                callingById,
                lang,
              ).map((line) =>
                line.calling ? `${line.names} - ${line.calling}` : line.names,
              )
            : [];

        return (
          <div key={sec.id} className="space-y-1.5">
            <p className="font-semibold">{wardBusinessSectionDefaultTitle(sec.kind, lang)}</p>
            {sec.kind === "new_members" ? (
              <div className="space-y-1.5">
                {newMembersTemplate.before ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{newMembersTemplate.before}</p>
                ) : null}
                <TwoColumnTable
                  rows={newMembersRows.map((row) => ({
                    left: row.familyName,
                    right: row.familyMembers,
                  }))}
                />
                {newMembersTemplate.after ? (
                  <p className="leading-relaxed whitespace-pre-wrap">{newMembersTemplate.after}</p>
                ) : null}
              </div>
            ) : sec.kind === "other" ? (
              <div className="space-y-1.5">
                {otherLines.map((line, i) => (
                  <p key={`${sec.id}-other-${i}`} className="leading-relaxed whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
            ) : commonText ? (
              <p className="leading-relaxed whitespace-pre-wrap">{commonText}</p>
            ) : null}
            {sec.kind === "releases" && releaseRows.length > 0 ? (
              <div className="mt-1">
                <FixedRowsTable rows={releaseRows} />
              </div>
            ) : null}
            {sec.kind === "sustainings" && (sec.sustainingEntries ?? []).length > 0 ? (
              <div className="mt-1">
                <FixedRowsTable
                  rows={combineWardBusinessEntries(
                    sec.sustainingEntries ?? [],
                    memberNameById,
                    callingById,
                    lang,
                  ).map((line) =>
                    line.calling ? `${line.names} - ${line.calling}` : line.names,
                  )}
                />
              </div>
            ) : null}
            {sec.kind === "aaron_priesthood_ordination" && (sec.ordinationEntries ?? []).length > 0 ? (
              <div className="space-y-2">
                {(sec.ordinationEntries ?? []).some((o) => o.office === "deacon") ? (
                  <>
                    <p className="leading-relaxed whitespace-pre-wrap">{deaconText}</p>
                    <FixedRowsTable
                      rows={(sec.ordinationEntries ?? [])
                        .filter((o) => o.office === "deacon")
                        .map((o) => memberNameById.get(o.memberId) ?? "—")}
                    />
                  </>
                ) : null}
                {(sec.ordinationEntries ?? []).some((o) => o.office === "teacher" || o.office === "priest") ? (
                  <>
                    <p className="leading-relaxed whitespace-pre-wrap">{tpText}</p>
                    <FixedRowsTable
                      rows={(sec.ordinationEntries ?? [])
                        .filter((o) => o.office === "teacher" || o.office === "priest")
                        .map(
                          (o) =>
                            `${memberNameById.get(o.memberId) ?? "—"} (${t(
                              lang,
                              o.office === "teacher" ? "Teacher" : "Priest",
                              o.office === "teacher" ? "Maestro" : "Presbítero",
                            )})`,
                        )}
                    />
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
