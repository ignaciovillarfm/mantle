"use client";

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
import { hoverRevealRemoveClassName, removeIconMarkClassName } from "@/lib/hoverRevealRemove";
import { MemberSearchSelect } from "@/components/MemberSearchSelect";
import { GroupedCallingSelect } from "@/components/GroupedCallingSelect";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  WARD_BUSINESS_SECTION_KINDS,
  wardBusinessSectionDefaultTitle,
  type SacramentFormLang,
  type WardBusinessModalFields,
  type WardBusinessSection,
  type WardBusinessSectionKind,
} from "@/lib/sacramentProgram";

function ft(lang: SacramentFormLang, b: { en: string; es: string }) {
  return lang === "es" ? b.es : b.en;
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
  office,
  onOfficeChange,
  showOffice,
  showLabels,
  removeLabel,
  onRemove,
  disableRemove = false,
  addLabel,
  onAdd,
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
  office?: WardBusinessModalFields["aaronicOffice"];
  onOfficeChange?: (office: WardBusinessModalFields["aaronicOffice"]) => void;
  showOffice: boolean;
  showLabels: boolean;
  removeLabel?: string;
  onRemove?: () => void;
  disableRemove?: boolean;
  addLabel?: string;
  onAdd?: () => void;
}) {
  useEffect(() => {
  }, [onAdd, onRemove, rowId, showCalling, showOffice, variant]);

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
        />
      </div>

      {showCalling ? (
        <div>
          {showLabels ? (
            <Label htmlFor={`ward-person-calling-${rowId}`} className="mb-1 block">
              {ft(formLang, { en: "Calling / role", es: "Cargo" })}
            </Label>
          ) : null}
          <GroupedCallingSelect
            id={`ward-person-calling-${rowId}`}
            value={callingPositionId ?? null}
            onChange={(positionId) => onCallingChange?.(positionId)}
            options={callingOptions}
            emptyLabel={ft(formLang, { en: "— Select calling —", es: "— Elegir llamamiento —" })}
          />
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
            value={office ?? ""}
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
            <span className={removeIconMarkClassName} aria-hidden>
              ×
            </span>
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
            className="size-10 rounded-full text-xl leading-none disabled:opacity-40"
            onClick={onAdd}
            aria-label={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
            title={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
          >
            +
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
  onConfirm,
  atCapacity,
  editingSection,
}: {
  open: boolean;
  onClose: () => void;
  formLang: SacramentFormLang;
  members: { id: string; name: string }[];
  callingPositions: { id: string; titleEn: string; titleEs: string; groupKey: string }[];
  onConfirm: (section: {
    kind: WardBusinessSectionKind;
    title: string;
    body: string;
    templateKey?: string;
    sustainingEntries?: { memberId: string; callingPositionId: string }[];
    releaseEntries?: { memberId: string; callingPositionId: string }[];
    ordinationEntries?: { memberId: string; office: WardBusinessModalFields["aaronicOffice"] }[];
    newMembersNames?: string;
  }) => void;
  atCapacity: boolean;
  editingSection?: WardBusinessSection | null;
}) {
  const [kind, setKind] = useState<WardBusinessSectionKind | "">("");
  const [fields, setFields] = useState<WardBusinessModalFields>(() => initialWardBusinessModalFields());
  const localizedCallingOptions = useMemo(
    () =>
      callingPositions.map((p) => ({
        id: p.id,
        title: formLang === "es" ? p.titleEs : p.titleEn,
        groupKey: p.groupKey,
      })),
    [callingPositions, formLang],
  );

  useEffect(() => {
  }, [formLang, localizedCallingOptions]);

  useEffect(() => {
  }, [fields.releaseRows.length, kind]);

  useEffect(() => {
    if (!open) return;
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
                calling_position_id: e.callingPositionId,
              }))
            : [newWardBusinessReleaseRow()],
        sustainingRows:
          editingSection.sustainingEntries && editingSection.sustainingEntries.length > 0
            ? editingSection.sustainingEntries.map((e) => ({
                id: newWardBusinessReleaseRow().id,
                member_id: e.memberId,
                calling_position_id: e.callingPositionId,
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
    onClose();
  }, [onClose]);

  const submit = useCallback(() => {
    if (!kind || (atCapacity && !editingSection)) return;
    const built = buildWardBusinessSectionFromModal(kind, formLang, fields, members, localizedCallingOptions);
    const sustainingEntries = fields.sustainingRows
      .map((r) => ({
        memberId: r.member_id?.trim() ?? "",
        callingPositionId: r.calling_position_id?.trim() ?? "",
      }))
      .filter((e) => e.memberId && e.callingPositionId);
    const releaseEntries = fields.releaseRows
      .map((r) => ({
        memberId: r.member_id?.trim() ?? "",
        callingPositionId: r.calling_position_id?.trim() ?? "",
      }))
      .filter((e) => e.memberId && e.callingPositionId);
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

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="flex max-h-[min(90vh,720px)] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b p-4 pb-3">
          <DialogTitle id="ward-add-section-title">
            {editingSection
              ? ft(formLang, { en: "Edit ward business section", es: "Editar sección de asuntos del barrio" })
              : ft(formLang, { en: "Add ward business section", es: "Agregar sección de asuntos del barrio" })}
          </DialogTitle>
          <DialogDescription>
            {ft(formLang, {
              en: "Choose the type, fill the fields, then add. You can still edit everything afterward.",
              es: "Elige el tipo, completa los campos y agrega. Luego puedes editar todo en el programa.",
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
              value={kind || undefined}
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
              {fields.sustainingRows.map((row) => (
                <WardBusinessPersonFields
                  key={row.id}
                  variant="sustaining"
                  rowId={`sustaining-${row.id}`}
                  formLang={formLang}
                  members={members}
                  callingOptions={localizedCallingOptions}
                  memberId={row.member_id}
                  onMemberChange={(memberId) =>
                    setFields((f) => ({
                      ...f,
                      sustainingRows: f.sustainingRows.map((r) =>
                        r.id === row.id ? { ...r, member_id: memberId } : r,
                      ),
                    }))
                  }
                  callingPositionId={row.calling_position_id}
                  onCallingChange={(positionId) =>
                    setFields((f) => ({
                      ...f,
                      sustainingRows: f.sustainingRows.map((r) =>
                        r.id === row.id ? { ...r, calling_position_id: positionId } : r,
                      ),
                    }))
                  }
                  showCalling
                  showOffice={false}
                  showLabels={fields.sustainingRows[0]?.id === row.id}
                  onRemove={
                    fields.sustainingRows.length > 1
                      ? () =>
                          setFields((f) => {
                            if (f.sustainingRows.length <= 1) {
                              return { ...f, sustainingRows: [newWardBusinessReleaseRow()] };
                            }
                            return { ...f, sustainingRows: f.sustainingRows.filter((r) => r.id !== row.id) };
                          })
                      : undefined
                  }
                  disableRemove={fields.sustainingRows.length <= 1}
                  onAdd={
                    row.id === fields.sustainingRows[fields.sustainingRows.length - 1]?.id &&
                    fields.sustainingRows.length < MAX_WARD_BUSINESS_RELEASE_ROWS
                      ? () =>
                          setFields((f) => {
                            if (f.sustainingRows.length >= MAX_WARD_BUSINESS_RELEASE_ROWS) return f;
                            return { ...f, sustainingRows: [...f.sustainingRows, newWardBusinessReleaseRow()] };
                          })
                      : undefined
                  }
                />
              ))}
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
            <div>
              <div className="space-y-3">
                {fields.releaseRows.map((row) => (
                  <WardBusinessPersonFields
                    key={row.id}
                    variant="release"
                    rowId={`release-${row.id}`}
                    formLang={formLang}
                    members={members}
                    callingOptions={localizedCallingOptions}
                    memberId={row.member_id}
                    onMemberChange={(memberId) =>
                      setFields((f) => ({
                        ...f,
                        releaseRows: f.releaseRows.map((r) =>
                          r.id === row.id ? { ...r, member_id: memberId } : r,
                        ),
                      }))
                    }
                    callingPositionId={row.calling_position_id}
                    onCallingChange={(positionId) =>
                      setFields((f) => ({
                        ...f,
                        releaseRows: f.releaseRows.map((r) =>
                          r.id === row.id ? { ...r, calling_position_id: positionId } : r,
                        ),
                      }))
                    }
                    showCalling
                    showOffice={false}
                    showLabels={fields.releaseRows[0]?.id === row.id}
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
                  />
                ))}
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
    </Dialog>
  );
}
