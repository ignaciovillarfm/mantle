"use client";

import { AddMemberForm } from "@/app/(ward)/members/AddMemberForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hoverRevealRemoveClassName } from "@/lib/hoverRevealRemove";
import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { GroupedCallingSelect } from "@/components/GroupedCallingSelect";
import type { CallingPositionOption } from "./loadSacramentState";
import { CreateCallingPositionFields } from "./CreateCallingPositionFields";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link2Icon, Trash2Icon, UnlinkIcon, UserPlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildWardBusinessSectionFromModal,
  defaultTemplateKeyForWardKind,
  formatNewMembersNames,
  localizeNewMembersMembersLine,
  initialWardBusinessModalFields,
  MAX_WARD_BUSINESS_RELEASE_ROWS,
  newWardBusinessOrdinationRow,
  newWardBusinessReleaseRow,
  parseNewMembersNames,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
  type WardBusinessModalFields,
  type WardBusinessReleaseRow,
  type WardBusinessSection,
  type WardBusinessSectionKind,
} from "@/lib/sacramentProgram";
import { isCallingGroupKey } from "@/lib/callings/groupCallingOptions";

function ft(lang: SacramentFormLang, b: { en: string; es: string }) {
  return lang === "es" ? b.es : b.en;
}

export type MemberActiveCalling = {
  callingPositionId: string;
  title: string;
};

function rowMemberLabel(
  row: WardBusinessReleaseRow,
  members: { id: string; name: string }[],
  lang: SacramentFormLang,
): string {
  const name = members.find((m) => m.id === row.member_id)?.name?.trim();
  if (name) return name;
  return ft(lang, { en: "(no name)", es: "(sin nombre)" });
}

/** Merge two people (and any existing companions) into one explicit link group. */
function linkSustainingRows(
  rows: WardBusinessReleaseRow[],
  fromId: string,
  toId: string,
): WardBusinessReleaseRow[] {
  const from = rows.find((r) => r.id === fromId);
  const to = rows.find((r) => r.id === toId);
  if (!from || !to || fromId === toId) return rows;

  const fromLink = from.link_group_id?.trim() || "";
  const toLink = to.link_group_id?.trim() || "";
  const linkId = fromLink || toLink || newWardBusinessReleaseRow().id;
  const calling = from.calling_position_id || to.calling_position_id;

  return rows.map((r) => {
    const inFrom = r.id === fromId || (fromLink && r.link_group_id === fromLink);
    const inTo = r.id === toId || (toLink && r.link_group_id === toLink);
    if (!inFrom && !inTo) return r;
    return {
      ...r,
      link_group_id: linkId,
      calling_position_id: calling ?? r.calling_position_id,
    };
  });
}

function unlinkSustainingRow(
  rows: WardBusinessReleaseRow[],
  rowId: string,
): WardBusinessReleaseRow[] {
  const row = rows.find((r) => r.id === rowId);
  const linkId = row?.link_group_id?.trim() || "";
  if (!linkId) return rows;

  let next = rows.map((r) => (r.id === rowId ? { ...r, link_group_id: null } : r));
  const remaining = next.filter((r) => r.link_group_id === linkId);
  if (remaining.length === 1) {
    const aloneId = remaining[0]!.id;
    next = next.map((r) => (r.id === aloneId ? { ...r, link_group_id: null } : r));
  }
  return next;
}

function WardBusinessPersonFields({
  variant,
  rowId,
  formLang,
  members,
  callingOptions,
  memberId,
  onMemberChange,
  callingPositionId,
  onCallingChange,
  showCalling,
  callingReadOnly,
  callingDisplay,
  office,
  onOfficeChange,
  showOffice,
  showLabels,
  removeLabel,
  onRemove,
  disableRemove = false,
  addLabel,
  onAdd,
  onRequestAddMember,
}: {
  variant: "release" | "sustaining" | "ordination";
  rowId: string;
  formLang: SacramentFormLang;
  members: { id: string; name: string }[];
  callingOptions: { id: string; title: string; groupKey: string }[];
  memberId: string | null;
  onMemberChange: (memberId: string | null) => void;
  callingPositionId?: string | null;
  onCallingChange?: (positionId: string | null) => void;
  showCalling: boolean;
  callingReadOnly?: boolean;
  callingDisplay?: string;
  office?: WardBusinessModalFields["aaronicOffice"];
  onOfficeChange?: (office: WardBusinessModalFields["aaronicOffice"]) => void;
  showOffice: boolean;
  showLabels: boolean;
  removeLabel?: string;
  onRemove?: () => void;
  disableRemove?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onRequestAddMember?: () => void;
}) {
  void variant;

  return (
    <div className="group grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div>
        {showLabels ? (
          <Label htmlFor={`ward-person-member-${rowId}`} className="mb-1 block">
            {ft(formLang, { en: "Name", es: "Nombre" })}
          </Label>
        ) : null}
        <MemberSearchSelect
          id={`ward-person-member-${rowId}`}
          lang={formLang}
          members={members}
          value={memberId}
          onChange={onMemberChange}
          footerAction={
            onRequestAddMember
              ? {
                  label: ft(formLang, { en: "+ Add new member…", es: "+ Agregar miembro…" }),
                  onSelect: onRequestAddMember,
                }
              : undefined
          }
        />
      </div>

      {showCalling ? (
        <div>
          {showLabels ? (
            <Label htmlFor={`ward-person-calling-${rowId}`} className="mb-1 block">
              {ft(formLang, { en: "Calling / role", es: "Cargo" })}
            </Label>
          ) : null}
          {callingReadOnly ? (
            <Input
              id={`ward-person-calling-${rowId}`}
              readOnly
              className="h-10 bg-muted/30"
              value={callingDisplay ?? ""}
              placeholder={ft(formLang, {
                en: "No calling on file",
                es: "Sin llamamiento en el registro",
              })}
            />
          ) : (
            <GroupedCallingSelect
              id={`ward-person-calling-${rowId}`}
              value={callingPositionId ?? null}
              onChange={(positionId) => onCallingChange?.(positionId)}
              options={callingOptions}
              emptyLabel={ft(formLang, { en: "— Select calling —", es: "— Elegir llamamiento —" })}
            />
          )}
        </div>
      ) : null}

      {showOffice ? (
        <div>
          {showLabels ? (
            <Label htmlFor={`ward-person-office-${rowId}`} className="mb-1 block">
              {ft(formLang, { en: "Office", es: "Oficio" })}
            </Label>
          ) : null}
          <Select
            value={office || null}
            onValueChange={(v) =>
              onOfficeChange?.((v || "") as WardBusinessModalFields["aaronicOffice"])
            }
          >
            <SelectTrigger id={`ward-person-office-${rowId}`} className="w-full">
              <SelectValue placeholder={ft(formLang, { en: "Choose…", es: "Elegir…" })} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deacon">{ft(formLang, { en: "Deacon", es: "Diácono" })}</SelectItem>
              <SelectItem value="teacher">{ft(formLang, { en: "Teacher", es: "Maestro" })}</SelectItem>
              <SelectItem value="priest">{ft(formLang, { en: "Priest", es: "Presbítero" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {onRemove ? (
        <div className="sm:pb-0.5">
          {showLabels ? (
            <span className="mb-1 block text-sm font-medium text-transparent select-none">.</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`size-10 rounded-full hover:bg-red-500/10 hover:text-red-600 disabled:opacity-40 ${hoverRevealRemoveClassName}`}
            disabled={disableRemove}
            onClick={onRemove}
            aria-label={removeLabel ?? ft(formLang, { en: "Remove person", es: "Quitar persona" })}
            title={removeLabel ?? ft(formLang, { en: "Remove person", es: "Quitar persona" })}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="sm:pb-0.5">
          {showLabels ? (
            <span className="mb-1 block text-sm font-medium text-transparent select-none">.</span>
          ) : null}
          <span
            aria-hidden="true"
            className="block h-10 w-10 rounded-full border border-transparent"
          />
        </div>
      )}

      {onAdd ? (
        <div className="sm:pb-0.5">
          {showLabels ? (
            <span className="mb-1 block text-sm font-medium text-transparent select-none">.</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 rounded-full disabled:opacity-40"
            onClick={onAdd}
            aria-label={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
            title={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
          >
            <UserPlusIcon className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="sm:pb-0.5">
          {showLabels ? (
            <span className="mb-1 block text-sm font-medium text-transparent select-none">.</span>
          ) : null}
          <span
            aria-hidden="true"
            className="block h-10 w-10 rounded-full border border-transparent"
          />
        </div>
      )}
    </div>
  );
}

const SECTION_KIND_ORDER: WardBusinessSectionKind[] = [
  "releases",
  "sustainings",
  "aaron_priesthood_ordination",
  "new_members",
  "other",
];

export function AddWardBusinessSectionModal({
  open,
  onClose,
  formLang,
  members,
  callingPositions,
  memberActiveCallings,
  wardId,
  onMembersChange,
  onCallingPositionsChange,
  onConfirm,
  atCapacity,
  editingSection,
}: {
  open: boolean;
  onClose: () => void;
  formLang: SacramentFormLang;
  members: { id: string; name: string }[];
  callingPositions: CallingPositionOption[];
  /** Set-apart callings by member — used to auto-fill Releases. */
  memberActiveCallings: Record<string, MemberActiveCalling[]>;
  wardId: string;
  onMembersChange: (members: { id: string; name: string }[]) => void;
  onCallingPositionsChange: (positions: CallingPositionOption[]) => void;
  onConfirm: (section: {
    kind: WardBusinessSectionKind;
    title: string;
    body: string;
    templateKey?: string;
    sustainingEntries?: { memberId: string; callingPositionId: string; linkGroupId?: string }[];
    releaseEntries?: { memberId: string; callingPositionId: string; linkGroupId?: string }[];
    ordinationEntries?: { memberId: string; office: WardBusinessModalFields["aaronicOffice"] }[];
    newMembersNames?: string;
  }) => void;
  atCapacity: boolean;
  editingSection?: WardBusinessSection | null;
}) {
  const [kind, setKind] = useState<WardBusinessSectionKind | "">("");
  const [fields, setFields] = useState<WardBusinessModalFields>(() => initialWardBusinessModalFields());
  const [linkingRowId, setLinkingRowId] = useState<string | null>(null);
  const [addMemberTarget, setAddMemberTarget] = useState<{
    kind: "sustaining" | "release" | "ordination";
    rowId: string;
  } | null>(null);

  const localizedCallingOptions = useMemo(
    () =>
      callingPositions.map((p) => ({
        id: p.id,
        title: formLang === "es" ? p.titleEs : p.titleEn,
        groupKey: p.groupKey,
      })),
    [callingPositions, formLang],
  );

  const callingOptionsForAddMember = useMemo(
    () => localizedCallingOptions.map((p) => ({ id: p.id, title: p.title })),
    [localizedCallingOptions],
  );

  useEffect(() => {
    if (!open) return;
    setLinkingRowId(null);
    if (editingSection) {
      setKind(editingSection.kind);
      setFields((prev) => ({
        ...prev,
        ...parseNewMembersNames(editingSection.newMembersNames ?? ""),
        releaseRows:
          editingSection.releaseEntries && editingSection.releaseEntries.length > 0
            ? editingSection.releaseEntries.map((e) => ({
                id: newWardBusinessReleaseRow().id,
                member_id: e.memberId,
                calling_position_id: e.callingPositionId || null,
                link_group_id: e.linkGroupId?.trim() || null,
              }))
            : [newWardBusinessReleaseRow()],
        sustainingRows:
          editingSection.sustainingEntries && editingSection.sustainingEntries.length > 0
            ? editingSection.sustainingEntries.map((e) => ({
                id: newWardBusinessReleaseRow().id,
                member_id: e.memberId,
                calling_position_id: e.callingPositionId || null,
                link_group_id: e.linkGroupId?.trim() || null,
              }))
            : [newWardBusinessReleaseRow()],
        ordinationRows:
          editingSection.ordinationEntries && editingSection.ordinationEntries.length > 0
            ? editingSection.ordinationEntries.map((e) => ({
                id: newWardBusinessOrdinationRow().id,
                member_id: e.memberId,
                office: e.office,
              }))
            : [newWardBusinessOrdinationRow()],
      }));
      return;
    }
    setKind("");
    setFields(initialWardBusinessModalFields());
  }, [editingSection, open]);

  const close = useCallback(() => {
    setAddMemberTarget(null);
    setLinkingRowId(null);
    onClose();
  }, [onClose]);

  const applyReleaseMember = useCallback(
    (rowId: string, memberId: string | null) => {
      setFields((f) => {
        const idx = f.releaseRows.findIndex((r) => r.id === rowId);
        if (idx < 0) return f;
        if (!memberId) {
          const next = [...f.releaseRows];
          next[idx] = { ...next[idx]!, member_id: null, calling_position_id: null };
          return { ...f, releaseRows: next };
        }
        const active = memberActiveCallings[memberId] ?? [];
        if (active.length <= 1) {
          const next = [...f.releaseRows];
          next[idx] = {
            ...next[idx]!,
            member_id: memberId,
            calling_position_id: active[0]?.callingPositionId ?? null,
          };
          return { ...f, releaseRows: next };
        }
        const remaining = MAX_WARD_BUSINESS_RELEASE_ROWS - (f.releaseRows.length - 1);
        const toAdd = active.slice(0, Math.max(1, remaining)).map((c, i) => ({
          id: i === 0 ? rowId : newWardBusinessReleaseRow().id,
          member_id: memberId,
          calling_position_id: c.callingPositionId,
          link_group_id: null,
        }));
        const next = [...f.releaseRows];
        next.splice(idx, 1, ...toAdd);
        return { ...f, releaseRows: next };
      });
    },
    [memberActiveCallings],
  );

  const submit = useCallback(() => {
    if (!kind || (atCapacity && !editingSection)) return;
    const built = buildWardBusinessSectionFromModal(kind, formLang, fields, members, localizedCallingOptions);
    const sustainingEntries = fields.sustainingRows
      .map((r) => {
        const linkGroupId = r.link_group_id?.trim() || "";
        return {
          memberId: r.member_id?.trim() ?? "",
          callingPositionId: r.calling_position_id?.trim() ?? "",
          ...(linkGroupId ? { linkGroupId } : {}),
        };
      })
      .filter((e) => e.memberId);
    const releaseEntries = fields.releaseRows
      .map((r) => {
        const linkGroupId = r.link_group_id?.trim() || "";
        return {
          memberId: r.member_id?.trim() ?? "",
          callingPositionId: r.calling_position_id?.trim() ?? "",
          ...(linkGroupId ? { linkGroupId } : {}),
        };
      })
      .filter((e) => e.memberId);
    const ordinationEntries = fields.ordinationRows
      .map((r) => ({
        memberId: r.member_id?.trim() ?? "",
        office: r.office,
      }))
      .filter((e) => e.memberId && e.office);
    const newMembersNames = formatNewMembersNames(fields.familyName, fields.familyMembers);
    onConfirm({
      kind,
      title: built.title,
      body: built.body,
      ...(defaultTemplateKeyForWardKind(kind)
        ? { templateKey: defaultTemplateKeyForWardKind(kind) ?? undefined }
        : {}),
      ...(kind === "sustainings" && sustainingEntries.length > 0
        ? { sustainingEntries }
        : {}),
      ...(kind === "releases" && releaseEntries.length > 0 ? { releaseEntries } : {}),
      ...(kind === "aaron_priesthood_ordination" && ordinationEntries.length > 0
        ? { ordinationEntries }
        : {}),
      ...(kind === "new_members"
        ? { newMembersNames }
        : {}),
    });
  }, [atCapacity, editingSection, fields, formLang, kind, localizedCallingOptions, members, onConfirm]);

  const allowAddMember = kind === "sustainings" || kind === "releases" || kind === "aaron_priesthood_ordination";

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <DialogContent className="flex max-h-[min(90vh,780px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b p-4 pb-3">
            <DialogTitle id="ward-add-section-title">
              {editingSection
                ? ft(formLang, { en: "Edit ward business section", es: "Editar sección de asuntos del barrio" })
                : ft(formLang, { en: "Add ward business section", es: "Agregar sección de asuntos del barrio" })}
            </DialogTitle>
            <DialogDescription>
              {ft(formLang, {
                en: "Pick a type, fill in, add. Edit later in the program.",
                es: "Elige el tipo, completa y agrega. Edita después en el programa.",
              })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-4">
          {atCapacity ? (
            <p className="text-sm text-amber-700">
              {ft(formLang, {
                en: "Maximum number of sections reached. Remove one to add another.",
                es: "Se alcanzó el máximo de secciones. Quita una para agregar otra.",
              })}
            </p>
          ) : null}

          <div className="space-y-4">
            <div>
              <Label htmlFor="ward-add-kind" className="mb-1 block">
                {ft(formLang, { en: "Section type", es: "Tipo de sección" })}
              </Label>
              <Select
                value={kind || null}
                disabled={Boolean(editingSection)}
                onValueChange={(v) => setKind((v ?? "") as WardBusinessSectionKind | "")}
              >
                <SelectTrigger id="ward-add-kind" className="w-full">
                  <SelectValue placeholder={ft(formLang, { en: "Choose…", es: "Elegir…" })} />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {wardBusinessSectionDefaultTitle(k, formLang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind === "sustainings" ? (
              <div className="space-y-3">
                <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-3">
                  {fields.sustainingRows.map((row, rowIndex) => {
                    const isLinked = Boolean(row.link_group_id?.trim());
                    const linkPeers = isLinked
                      ? fields.sustainingRows.filter(
                          (r) =>
                            r.id !== row.id &&
                            r.link_group_id?.trim() === row.link_group_id?.trim(),
                        )
                      : [];
                    const linkCandidates = fields.sustainingRows.filter((r) => {
                      if (r.id === row.id) return false;
                      if (!r.member_id?.trim()) return false;
                      if (
                        isLinked &&
                        r.link_group_id?.trim() &&
                        r.link_group_id.trim() === row.link_group_id?.trim()
                      ) {
                        return false;
                      }
                      return true;
                    });
                    const canOpenLink =
                      isLinked ||
                      (Boolean(row.member_id?.trim()) && linkCandidates.length > 0);
                    const linkLabel = ft(formLang, {
                      en: "Link with another person",
                      es: "Vincular con otra persona",
                    });
                    const unlinkLabel = ft(formLang, {
                      en: "Unlink",
                      es: "Desvincular",
                    });
                    const removeLabel = ft(formLang, {
                      en: "Remove",
                      es: "Quitar",
                    });

                    return (
                      <div
                        key={row.id}
                        className="group grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
                      >
                        <div>
                          {rowIndex === 0 ? (
                            <Label
                              htmlFor={`sustaining-member-${row.id}`}
                              className="mb-1 block"
                            >
                              {ft(formLang, { en: "Name", es: "Nombre" })}
                            </Label>
                          ) : null}
                          <MemberSearchSelect
                            id={`sustaining-member-${row.id}`}
                            lang={formLang}
                            members={members}
                            value={row.member_id}
                            onChange={(memberId) =>
                              setFields((f) => ({
                                ...f,
                                sustainingRows: f.sustainingRows.map((r) =>
                                  r.id === row.id ? { ...r, member_id: memberId } : r,
                                ),
                              }))
                            }
                            footerAction={
                              allowAddMember
                                ? {
                                    label: ft(formLang, {
                                      en: "+ Add new member…",
                                      es: "+ Agregar miembro…",
                                    }),
                                    onSelect: () =>
                                      setAddMemberTarget({
                                        kind: "sustaining",
                                        rowId: row.id,
                                      }),
                                  }
                                : undefined
                            }
                          />
                        </div>

                        <div>
                          {rowIndex === 0 ? (
                            <Label
                              htmlFor={`sustaining-calling-${row.id}`}
                              className="mb-1 block"
                            >
                              {ft(formLang, { en: "Calling", es: "Cargo" })}
                            </Label>
                          ) : null}
                          <GroupedCallingSelect
                            id={`sustaining-calling-${row.id}`}
                            value={row.calling_position_id}
                            onChange={(positionId) =>
                              setFields((f) => {
                                const linkId = row.link_group_id?.trim() || "";
                                return {
                                  ...f,
                                  sustainingRows: f.sustainingRows.map((r) => {
                                    if (r.id === row.id) {
                                      return { ...r, calling_position_id: positionId };
                                    }
                                    if (linkId && r.link_group_id === linkId) {
                                      return { ...r, calling_position_id: positionId };
                                    }
                                    return r;
                                  }),
                                };
                              })
                            }
                            options={localizedCallingOptions}
                            emptyLabel={ft(formLang, {
                              en: "Calling…",
                              es: "Cargo…",
                            })}
                          />
                        </div>

                        <div className="sm:pb-0.5">
                          {rowIndex === 0 ? (
                            <span className="mb-1 block text-sm font-medium text-transparent select-none">
                              .
                            </span>
                          ) : null}
                          <Popover
                            open={linkingRowId === row.id}
                            onOpenChange={(next) => setLinkingRowId(next ? row.id : null)}
                          >
                            <PopoverTrigger
                              disabled={!canOpenLink}
                              className={cn(
                                "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground outline-none hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40",
                                isLinked && "border-primary/40 bg-primary/10 text-primary",
                              )}
                              aria-label={linkLabel}
                              title={
                                canOpenLink
                                  ? linkLabel
                                  : ft(formLang, {
                                      en: "Add another person first, then link",
                                      es: "Agrega otra persona primero, luego vincula",
                                    })
                              }
                            >
                              <Link2Icon className="size-4" />
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-64 gap-1 p-1.5">
                              {isLinked ? (
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    setFields((f) => ({
                                      ...f,
                                      sustainingRows: unlinkSustainingRow(f.sustainingRows, row.id),
                                    }));
                                    setLinkingRowId(null);
                                  }}
                                >
                                  <UnlinkIcon className="size-4 shrink-0 text-foreground/55" />
                                  <span>
                                    {unlinkLabel}
                                    {linkPeers.length > 0
                                      ? ` (${linkPeers
                                          .map((p) => rowMemberLabel(p, members, formLang))
                                          .join(", ")})`
                                      : ""}
                                  </span>
                                </button>
                              ) : null}
                              {linkCandidates.length > 0 ? (
                                <div className="px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground/45">
                                  {ft(formLang, {
                                    en: "Link with",
                                    es: "Vincular con",
                                  })}
                                </div>
                              ) : null}
                              {linkCandidates.map((candidate) => (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                                  onClick={() => {
                                    setFields((f) => ({
                                      ...f,
                                      sustainingRows: linkSustainingRows(
                                        f.sustainingRows,
                                        row.id,
                                        candidate.id,
                                      ),
                                    }));
                                    setLinkingRowId(null);
                                  }}
                                >
                                  <Link2Icon className="size-4 shrink-0 text-foreground/45" />
                                  <span className="truncate">
                                    {rowMemberLabel(candidate, members, formLang)}
                                  </span>
                                </button>
                              ))}
                              {isLinked && linkCandidates.length === 0 ? (
                                <p className="px-2.5 py-2 text-xs text-foreground/55">
                                  {ft(formLang, {
                                    en: "No other people to link.",
                                    es: "No hay otras personas para vincular.",
                                  })}
                                </p>
                              ) : null}
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="sm:pb-0.5">
                          {rowIndex === 0 ? (
                            <span className="mb-1 block text-sm font-medium text-transparent select-none">
                              .
                            </span>
                          ) : null}
                          {fields.sustainingRows.length > 1 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className={`size-9 rounded-full hover:bg-red-500/10 hover:text-red-600 ${hoverRevealRemoveClassName}`}
                              onClick={() =>
                                setFields((f) => {
                                  const linkId = row.link_group_id?.trim() || "";
                                  let next = f.sustainingRows.filter((r) => r.id !== row.id);
                                  if (linkId) {
                                    const remainingLinked = next.filter(
                                      (r) => r.link_group_id === linkId,
                                    );
                                    if (remainingLinked.length === 1) {
                                      const aloneId = remainingLinked[0]!.id;
                                      next = next.map((r) =>
                                        r.id === aloneId ? { ...r, link_group_id: null } : r,
                                      );
                                    }
                                  }
                                  return {
                                    ...f,
                                    sustainingRows:
                                      next.length > 0 ? next : [newWardBusinessReleaseRow()],
                                  };
                                })
                              }
                              aria-label={removeLabel}
                              title={removeLabel}
                            >
                              <Trash2Icon className="size-4" />
                            </Button>
                          ) : (
                            <span
                              aria-hidden="true"
                              className="block size-9 rounded-full border border-transparent"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {fields.sustainingRows.length < MAX_WARD_BUSINESS_RELEASE_ROWS ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 px-2.5"
                      onClick={() =>
                        setFields((f) => {
                          if (f.sustainingRows.length >= MAX_WARD_BUSINESS_RELEASE_ROWS) return f;
                          return {
                            ...f,
                            sustainingRows: [...f.sustainingRows, newWardBusinessReleaseRow()],
                          };
                        })
                      }
                      title={ft(formLang, {
                        en: "Add another person",
                        es: "Agregar otra persona",
                      })}
                    >
                      <UserPlusIcon className="size-4" />
                      <span className="sr-only sm:not-sr-only sm:inline">
                        {ft(formLang, { en: "Person", es: "Persona" })}
                      </span>
                    </Button>
                  ) : null}
                  <CreateCallingPositionFields
                    lang={formLang}
                    wardId={wardId}
                    onCreated={(pos) => {
                      const groupKey = isCallingGroupKey(pos.groupKey) ? pos.groupKey : "other";
                      onCallingPositionsChange([
                        ...callingPositions,
                        {
                          id: pos.id,
                          titleEn: pos.title,
                          titleEs: pos.title,
                          groupKey,
                        },
                      ]);
                      setFields((f) => {
                        const draft = [...f.sustainingRows]
                          .reverse()
                          .find((r) => !r.calling_position_id);
                        if (!draft) return f;
                        return {
                          ...f,
                          sustainingRows: f.sustainingRows.map((r) =>
                            r.id === draft.id ? { ...r, calling_position_id: pos.id } : r,
                          ),
                        };
                      });
                    }}
                  />
                </div>
              </div>
            ) : null}

            {kind === "aaron_priesthood_ordination" ? (
              <div className="space-y-3">
                {fields.ordinationRows.map((row) => (
                  <WardBusinessPersonFields
                    key={row.id}
                    variant="ordination"
                    rowId={`ordination-${row.id}`}
                    formLang={formLang}
                    members={members}
                    callingOptions={localizedCallingOptions}
                    memberId={row.member_id}
                    onMemberChange={(memberId) =>
                      setFields((f) => ({
                        ...f,
                        ordinationRows: f.ordinationRows.map((r) =>
                          r.id === row.id ? { ...r, member_id: memberId } : r,
                        ),
                      }))
                    }
                    showCalling={false}
                    office={row.office}
                    onOfficeChange={(office) =>
                      setFields((f) => ({
                        ...f,
                        ordinationRows: f.ordinationRows.map((r) =>
                          r.id === row.id ? { ...r, office } : r,
                        ),
                      }))
                    }
                    showOffice
                    showLabels={fields.ordinationRows[0]?.id === row.id}
                    onRemove={
                      fields.ordinationRows.length > 1
                        ? () =>
                            setFields((f) => {
                              if (f.ordinationRows.length <= 1) {
                                return { ...f, ordinationRows: [newWardBusinessOrdinationRow()] };
                              }
                              return { ...f, ordinationRows: f.ordinationRows.filter((r) => r.id !== row.id) };
                            })
                        : undefined
                    }
                    disableRemove={fields.ordinationRows.length <= 1}
                    onAdd={
                      row.id === fields.ordinationRows[fields.ordinationRows.length - 1]?.id &&
                      fields.ordinationRows.length < MAX_WARD_BUSINESS_RELEASE_ROWS
                        ? () =>
                            setFields((f) => {
                              if (f.ordinationRows.length >= MAX_WARD_BUSINESS_RELEASE_ROWS) return f;
                              return {
                                ...f,
                                ordinationRows: [...f.ordinationRows, newWardBusinessOrdinationRow()],
                              };
                            })
                        : undefined
                    }
                    onRequestAddMember={
                      allowAddMember
                        ? () => setAddMemberTarget({ kind: "ordination", rowId: row.id })
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}

            {kind === "new_members" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ward-newm-family" className="mb-1 block">
                    {ft(formLang, {
                      en: "Family name",
                      es: "Apellido de familia",
                    })}
                  </Label>
                  <Input
                    id="ward-newm-family"
                    className="mt-1"
                    value={fields.familyName}
                    onChange={(e) => setFields((f) => ({ ...f, familyName: e.target.value }))}
                    placeholder={ft(formLang, {
                      en: "Surname",
                      es: "Apellido",
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="ward-newm-members" className="mb-1 block">
                    {ft(formLang, {
                      en: "Members",
                      es: "Integrantes",
                    })}
                  </Label>
                  <Input
                    id="ward-newm-members"
                    className="mt-1"
                    value={fields.familyMembers}
                    onChange={(e) => setFields((f) => ({ ...f, familyMembers: e.target.value }))}
                    placeholder={ft(formLang, {
                      en: "e.g. Daniel, Maria Paula. Children: Lucy and Teo",
                      es: "Ej. Daniel, María Paula. Hijos: Lucy y Teo",
                    })}
                  />
                </div>
                <div className="sm:col-span-2 text-xs text-foreground/65">
                  {ft(formLang, {
                    en: "Printed line",
                    es: "Línea en el programa",
                  })}
                  :{" "}
                  {formatNewMembersNames(
                    fields.familyName,
                    localizeNewMembersMembersLine(fields.familyMembers, formLang),
                  ) || "—"}
                </div>
              </div>
            ) : null}

            {kind === "releases" ? (
              <div className="space-y-3">
                <div className="space-y-2 rounded-lg border border-border/80 bg-muted/10 p-3">
                  {fields.releaseRows.map((row, rowIndex) => {
                    const autoCalling = row.calling_position_id
                      ? localizedCallingOptions.find((c) => c.id === row.calling_position_id)?.title ?? ""
                      : "";
                    return (
                      <WardBusinessPersonFields
                        key={row.id}
                        variant="release"
                        rowId={`release-${row.id}`}
                        formLang={formLang}
                        members={members}
                        callingOptions={localizedCallingOptions}
                        memberId={row.member_id}
                        onMemberChange={(memberId) => applyReleaseMember(row.id, memberId)}
                        callingPositionId={row.calling_position_id}
                        showCalling
                        callingReadOnly
                        callingDisplay={autoCalling}
                        showOffice={false}
                        showLabels={rowIndex === 0}
                        onRemove={
                          fields.releaseRows.length > 1
                            ? () =>
                                setFields((f) => {
                                  if (f.releaseRows.length <= 1) {
                                    return { ...f, releaseRows: [newWardBusinessReleaseRow()] };
                                  }
                                  return { ...f, releaseRows: f.releaseRows.filter((r) => r.id !== row.id) };
                                })
                            : undefined
                        }
                        disableRemove={fields.releaseRows.length <= 1}
                        onAdd={
                          row.id === fields.releaseRows[fields.releaseRows.length - 1]?.id &&
                          fields.releaseRows.length < MAX_WARD_BUSINESS_RELEASE_ROWS
                            ? () =>
                                setFields((f) => {
                                  if (f.releaseRows.length >= MAX_WARD_BUSINESS_RELEASE_ROWS) return f;
                                  return { ...f, releaseRows: [...f.releaseRows, newWardBusinessReleaseRow()] };
                                })
                            : undefined
                        }
                        onRequestAddMember={
                          allowAddMember
                            ? () => setAddMemberTarget({ kind: "release", rowId: row.id })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {kind === "other" ? (
              <div>
                <Label htmlFor="ward-other" className="mb-1 block">
                  {ft(formLang, { en: "Details", es: "Detalles" })}
                </Label>
                <Textarea
                  id="ward-other"
                  rows={4}
                  className="mt-1"
                  value={fields.otherDetails}
                  onChange={(e) => setFields((f) => ({ ...f, otherDetails: e.target.value }))}
                  placeholder={ft(formLang, {
                    en: "Baby blessing, confirmation, ward activity announcement, etc.",
                    es: "Bendición de bebé, confirmación, otro anuncio, etc.",
                  })}
                />
              </div>
            ) : null}
          </div>
            </div>
          </ScrollArea>
          <DialogFooter className="border-t p-4">
            <Button type="button" variant="outline" onClick={close}>
              {ft(formLang, { en: "Cancel", es: "Cancelar" })}
            </Button>
            <Button
              type="button"
              disabled={!kind || (atCapacity && !editingSection)}
              onClick={() => void submit()}
            >
              {editingSection
                ? ft(formLang, { en: "Save changes", es: "Guardar cambios" })
                : ft(formLang, { en: "Add section", es: "Agregar sección" })}
            </Button>
          </DialogFooter>
        </DialogContent>

        <Dialog
          open={Boolean(addMemberTarget)}
          onOpenChange={(next) => {
            if (!next) setAddMemberTarget(null);
          }}
        >
          <DialogContent
            className="z-[110] flex max-h-[min(90vh,720px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-y-auto sm:max-w-md"
            overlayClassName="z-[110]"
          >
            <DialogHeader className="pb-3">
              <DialogTitle id="ward-business-add-member-title">
                {ft(formLang, { en: "Add member", es: "Agregar miembro" })}
              </DialogTitle>
            </DialogHeader>
            <AddMemberForm
              wardId={wardId}
              callingOptions={callingOptionsForAddMember}
              onSuccess={(member) => {
                onMembersChange(
                  [...members, member].sort((a, b) => a.name.localeCompare(b.name)),
                );
                const target = addMemberTarget;
                setAddMemberTarget(null);
                if (!target) return;
                if (target.kind === "release") {
                  applyReleaseMember(target.rowId, member.id);
                  return;
                }
                if (target.kind === "sustaining") {
                  setFields((f) => ({
                    ...f,
                    sustainingRows: f.sustainingRows.map((r) =>
                      r.id === target.rowId ? { ...r, member_id: member.id } : r,
                    ),
                  }));
                  return;
                }
                setFields((f) => ({
                  ...f,
                  ordinationRows: f.ordinationRows.map((r) =>
                    r.id === target.rowId ? { ...r, member_id: member.id } : r,
                  ),
                }));
              }}
            />
          </DialogContent>
        </Dialog>
      </Dialog>
    </>
  );
}
