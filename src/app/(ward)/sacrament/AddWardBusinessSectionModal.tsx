"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GroupedCallingSelect } from "@/components/GroupedCallingSelect";
import {
  buildWardBusinessSectionFromModal,
  defaultTemplateKeyForWardKind,
  initialWardBusinessModalFields,
  MAX_WARD_BUSINESS_RELEASE_ROWS,
  newWardBusinessOrdinationRow,
  newWardBusinessReleaseRow,
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

function WardMemberSelect({
  id,
  value,
  onChange,
  members,
  formLang,
  className = "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm",
}: {
  id: string;
  value: string | null;
  onChange: (memberId: string | null) => void;
  members: { id: string; name: string }[];
  formLang: SacramentFormLang;
  className?: string;
}) {
  return (
    <select
      id={id}
      className={className}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? e.target.value : null)}
    >
      <option value="">{ft(formLang, { en: "— Select member —", es: "— Elegir miembro —" })}</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
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
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "ward-business-shared-component-debug-1",
        hypothesisId: "H1",
        location: "AddWardBusinessSectionModal.tsx:WardBusinessPersonFields",
        message: "Shared ward-business person component rendered",
        data: { variant, rowId, showCalling, showOffice, hasRemove: Boolean(onRemove), hasAdd: Boolean(onAdd) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [onAdd, onRemove, rowId, showCalling, showOffice, variant]);

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
      <div>
        {showLabels ? (
          <label htmlFor={`ward-person-member-${rowId}`} className="mb-1 block text-sm font-medium text-foreground">
            {ft(formLang, { en: "Name", es: "Nombre" })}
          </label>
        ) : null}
        <WardMemberSelect
          id={`ward-person-member-${rowId}`}
          members={members}
          formLang={formLang}
          value={memberId}
          onChange={onMemberChange}
        />
      </div>

      {showCalling ? (
        <div>
          {showLabels ? (
            <label htmlFor={`ward-person-calling-${rowId}`} className="mb-1 block text-sm font-medium text-foreground">
              {ft(formLang, { en: "Calling / role", es: "Cargo" })}
            </label>
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
            <label htmlFor={`ward-person-office-${rowId}`} className="mb-1 block text-sm font-medium text-foreground">
              {ft(formLang, { en: "Office", es: "Oficio" })}
            </label>
          ) : null}
          <select
            id={`ward-person-office-${rowId}`}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            value={office ?? ""}
            onChange={(e) => onOfficeChange?.(e.target.value as WardBusinessModalFields["aaronicOffice"])}
          >
            <option value="">{ft(formLang, { en: "Choose…", es: "Elegir…" })}</option>
            <option value="deacon">{ft(formLang, { en: "Deacon", es: "Diácono" })}</option>
            <option value="teacher">{ft(formLang, { en: "Teacher", es: "Maestro" })}</option>
            <option value="priest">{ft(formLang, { en: "Priest", es: "Presbítero" })}</option>
          </select>
        </div>
      ) : null}

      {onRemove ? (
        <div className="sm:pb-0.5">
          {showLabels ? (
            <span className="mb-1 block text-sm font-medium text-transparent select-none">.</span>
          ) : null}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-base leading-none hover:bg-surface-hover disabled:opacity-40"
            disabled={disableRemove}
            onClick={onRemove}
            aria-label={removeLabel ?? ft(formLang, { en: "Remove person", es: "Quitar persona" })}
            title={removeLabel ?? ft(formLang, { en: "Remove person", es: "Quitar persona" })}
          >
            ×
          </button>
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
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-xl leading-none hover:bg-surface-hover disabled:opacity-40"
            onClick={onAdd}
            aria-label={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
            title={addLabel ?? ft(formLang, { en: "Add person", es: "Agregar persona" })}
          >
            +
          </button>
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

function splitNewMembersNames(raw: string): { familyName: string; familyMembers: string } {
  const text = raw.trim();
  if (!text) return { familyName: "", familyMembers: "" };
  const firstComma = text.indexOf(",");
  if (firstComma < 0) return { familyName: text, familyMembers: "" };
  return {
    familyName: text.slice(0, firstComma).trim(),
    familyMembers: text.slice(firstComma + 1).trim(),
  };
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
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "sacrament-calling-translation-debug-1",
        hypothesisId: "H3",
        location: "AddWardBusinessSectionModal.tsx:localizedCallingOptions",
        message: "Computed localized calling options for sacrament modal",
        data: {
          lang: formLang,
          optionCount: localizedCallingOptions.length,
          sample: localizedCallingOptions.slice(0, 5).map((o) => o.title),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [formLang, localizedCallingOptions]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "sacrament-relevos-ordination-ui-debug-1",
        hypothesisId: "H1",
        location: "AddWardBusinessSectionModal.tsx:kindSwitch",
        message: "Rendered ward-business kind specific UI",
        data: { kind, releaseRowsCount: fields.releaseRows.length, hasOrdinationCallingField: false },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [fields.releaseRows.length, kind]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (editingSection) {
      setKind(editingSection.kind);
      setFields((prev) => ({
        ...prev,
        ...splitNewMembersNames(editingSection.newMembersNames ?? ""),
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
    const newMembersNames = [fields.familyName.trim(), fields.familyMembers.trim()].filter(Boolean).join(", ");
    // #region agent log
    fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
      body: JSON.stringify({
        sessionId: "812a29",
        runId: "sacrament-new-members-debug-1",
        hypothesisId: "H9",
        location: "AddWardBusinessSectionModal.tsx:submit:newMembers",
        message: "Composed new-members names from separate family + members fields",
        data: {
          kind,
          familyName: fields.familyName.trim(),
          familyMembers: fields.familyMembers.trim(),
          newMembersNames,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="max-h-[min(90vh,720px)] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ward-add-section-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="ward-add-section-title" className="text-lg font-semibold text-foreground">
          {editingSection
            ? ft(formLang, { en: "Edit ward business section", es: "Editar sección de asuntos del barrio" })
            : ft(formLang, { en: "Add ward business section", es: "Agregar sección de asuntos del barrio" })}
        </h2>
        <p className="mt-1 text-sm text-foreground/70">
          {ft(formLang, {
            en: "Choose the type, fill the fields, then add. You can still edit everything afterward.",
            es: "Elige el tipo, completa los campos y agrega. Luego puedes editar todo en el programa.",
          })}
        </p>

        {atCapacity ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            {ft(formLang, {
              en: "Maximum number of sections reached. Remove one to add another.",
              es: "Se alcanzó el máximo de secciones. Quita una para agregar otra.",
            })}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="ward-add-kind" className="mb-1 block text-sm font-medium text-foreground">
              {ft(formLang, { en: "Section type", es: "Tipo de sección" })}
            </label>
            <select
              id="ward-add-kind"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={kind}
              disabled={Boolean(editingSection)}
              onChange={(e) =>
                setKind(
                  e.target.value === ""
                    ? ""
                    : (e.target.value as WardBusinessSectionKind),
                )
              }
            >
              <option value="">{ft(formLang, { en: "Choose…", es: "Elegir…" })}</option>
              {SECTION_KIND_ORDER.map((k) => (
                <option key={k} value={k}>
                  {wardBusinessSectionDefaultTitle(k, formLang)}
                </option>
              ))}
            </select>
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
                <label htmlFor="ward-newm-family" className="mb-1 block text-sm font-medium text-foreground">
                  {ft(formLang, {
                    en: "Family name",
                    es: "Apellido de familia",
                  })}
                </label>
                <input
                  id="ward-newm-family"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={fields.familyName}
                  onChange={(e) => setFields((f) => ({ ...f, familyName: e.target.value }))}
                  placeholder={ft(formLang, {
                    en: "e.g. Lozano Family",
                    es: "Ej. Familia Lozano",
                  })}
                />
              </div>
              <div>
                <label htmlFor="ward-newm-members" className="mb-1 block text-sm font-medium text-foreground">
                  {ft(formLang, {
                    en: "Members",
                    es: "Integrantes",
                  })}
                </label>
                <input
                  id="ward-newm-members"
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={fields.familyMembers}
                  onChange={(e) => setFields((f) => ({ ...f, familyMembers: e.target.value }))}
                  placeholder={ft(formLang, {
                    en: "e.g. Daniel, Maria Paula. Children: Lucy and Teo",
                    es: "Ej. Daniel, Maria Paula. Hijos: Lucy y Teo",
                  })}
                />
              </div>
              <div className="sm:col-span-2 text-xs text-foreground/65">
                {ft(formLang, {
                  en: "Preview: Family, members",
                  es: "Vista previa: Familia, integrantes",
                })}
                :{" "}
                {[fields.familyName.trim(), fields.familyMembers.trim()].filter(Boolean).join(", ")}
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
              <label htmlFor="ward-other" className="mb-1 block text-sm font-medium text-foreground">
                {ft(formLang, { en: "Details", es: "Detalles" })}
              </label>
              <textarea
                id="ward-other"
                rows={4}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-surface-hover"
            onClick={close}
          >
            {ft(formLang, { en: "Cancel", es: "Cancelar" })}
          </button>
          <button
            type="button"
            disabled={!kind || (atCapacity && !editingSection)}
            className="rounded-lg border border-border bg-foreground px-4 py-2 text-sm text-background hover:opacity-90 disabled:opacity-50"
            onClick={() => void submit()}
          >
            {editingSection
              ? ft(formLang, { en: "Save changes", es: "Guardar cambios" })
              : ft(formLang, { en: "Add section", es: "Agregar sección" })}
          </button>
        </div>
      </div>
    </div>
  );
}
