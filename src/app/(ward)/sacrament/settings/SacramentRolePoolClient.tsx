"use client";

import { AddMemberModal } from "@/app/(ward)/members/AddMemberModal";
import { MemberSearchInput } from "@/components/MemberSearchPanel";
import { memberMatchesQuery, normalizeMemberSearch } from "@/lib/members/memberSearch";
import {
  dedupeMemberIds,
  normalizeRolePool,
  reorderListItems,
  SACRAMENT_ROLE_KEYS,
  sacramentRoleLabel,
  serializeRolePool,
  type SacramentRoleKey,
  type SacramentRolePool,
} from "@/lib/sacrament/sacramentRoles";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RolePoolDraggableList } from "./RolePoolDraggableList";

const AUTO_SAVE_DEBOUNCE_MS = 800;

type MemberOption = { id: string; name: string };
type Lang = "en" | "es";

function t(lang: Lang, en: string, es: string) {
  return lang === "es" ? es : en;
}

export function SacramentRolePoolClient({
  wardId,
  wardName,
  members: initialMembers,
  initialRolePool,
  callingOptions,
}: {
  wardId: string;
  wardName: string;
  members: MemberOption[];
  initialRolePool: SacramentRolePool;
  callingOptions: { id: string; title: string }[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const [rolePool, setRolePool] = useState<SacramentRolePool>(initialRolePool);
  const [lang, setLang] = useState<Lang>("es");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [autosaveReady, setAutosaveReady] = useState(false);
  const lastSavedRef = useRef(serializeRolePool(initialRolePool));
  const rolePoolRef = useRef(rolePool);
  rolePoolRef.current = rolePool;

  useEffect(() => {
    lastSavedRef.current = serializeRolePool(initialRolePool);
    setRolePool(initialRolePool);
    setAutosaveReady(false);
    const id = window.setTimeout(() => setAutosaveReady(true), 0);
    return () => clearTimeout(id);
  }, [initialRolePool]);

  const memberNameById = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const rolesForMember = useCallback(
    (memberId: string): SacramentRoleKey[] =>
      SACRAMENT_ROLE_KEYS.filter((role) => rolePool[role].includes(memberId)),
    [rolePool],
  );

  const addMember = useCallback((role: SacramentRoleKey, memberId: string) => {
    if (!memberId) return;
    setRolePool((prev) => {
      if (prev[role].includes(memberId)) return prev;
      return { ...prev, [role]: dedupeMemberIds([...prev[role], memberId]) };
    });
  }, []);

  const removeMember = useCallback((role: SacramentRoleKey, memberId: string) => {
    setRolePool((prev) => ({
      ...prev,
      [role]: prev[role].filter((id) => id !== memberId),
    }));
  }, []);

  const reorderMembers = useCallback(
    (role: SacramentRoleKey, startIndex: number, finishIndex: number) => {
      if (startIndex === finishIndex) return;
      setRolePool((prev) => {
        const list = dedupeMemberIds(prev[role]);
        const next = dedupeMemberIds(reorderListItems(list, startIndex, finishIndex));
        if (next.length !== list.length || next.every((id, i) => id === list[i])) return prev;
        return { ...prev, [role]: next };
      });
    },
    [],
  );

  const handleMemberCreated = useCallback((member: { id: string; name: string }) => {
    setMembers((prev) => {
      if (prev.some((m) => m.id === member.id)) return prev;
      return [...prev, member].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
    });
    setSelectedMemberId(member.id);
    setSearch(member.name);
  }, []);

  useEffect(() => {
    if (!autosaveReady) return;

    const snapshot = serializeRolePool(rolePool);
    if (snapshot === lastSavedRef.current) return;

    setSaveStatus((status) => (status === "saved" || status === "error" ? "idle" : status));
    setSaveMsg(null);

    const timer = window.setTimeout(() => {
      const payload = serializeRolePool(rolePoolRef.current);
      if (payload === lastSavedRef.current) return;

      setSaveStatus("saving");

      void (async () => {
        const poolToSave = normalizeRolePool(JSON.parse(payload) as SacramentRolePool);
        try {
          const res = await fetch("/api/sacrament/role-pool", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wardId, rolePool: poolToSave }),
          });
          const json = (await res.json()) as { error?: string };
          if (!res.ok) throw new Error(json.error ?? "Failed to save");

          if (serializeRolePool(rolePoolRef.current) === payload) {
            lastSavedRef.current = payload;
            setSaveStatus("saved");
            setSaveMsg(null);
          } else {
            setSaveStatus("idle");
          }
        } catch (e) {
          if (serializeRolePool(rolePoolRef.current) === payload) {
            setSaveStatus("error");
            setSaveMsg(e instanceof Error ? e.message : "Failed to save");
          } else {
            setSaveStatus("idle");
          }
        }
      })();
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [autosaveReady, rolePool, wardId]);

  const query = normalizeMemberSearch(search);
  const searchResults = useMemo(() => {
    if (!query) return [];
    return members.filter((m) => memberMatchesQuery(m.name, query)).slice(0, 12);
  }, [members, query]);

  const selectedMember = selectedMemberId
    ? (members.find((m) => m.id === selectedMemberId) ?? null)
    : null;

  const assignSelected = useCallback(
    (role: SacramentRoleKey) => {
      if (!selectedMemberId) return;
      addMember(role, selectedMemberId);
    },
    [addMember, selectedMemberId],
  );

  const totalAssigned = useMemo(
    () => SACRAMENT_ROLE_KEYS.reduce((sum, role) => sum + rolePool[role].length, 0),
    [rolePool],
  );

  const saveHint =
    saveStatus === "saving"
      ? t(lang, "Saving…", "Guardando…")
      : saveStatus === "saved"
        ? t(lang, "Saved", "Guardado")
        : saveStatus === "error" && saveMsg
          ? saveMsg
          : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-foreground/70">{t(lang, "Language", "Idioma")}</span>
          <select
            suppressHydrationWarning
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <AddMemberModal
            ward={{ id: wardId, name: wardName }}
            callingOptions={callingOptions}
            triggerLabel={t(lang, "Add member", "Agregar miembro")}
            onMemberCreated={handleMemberCreated}
          />
          {saveHint ? (
            <span
              className={`text-sm tabular-nums ${
                saveStatus === "error"
                  ? "text-red-600"
                  : saveStatus === "saved"
                    ? "text-green-700 dark:text-green-400"
                    : "text-foreground/50"
              }`}
              aria-live="polite"
            >
              {saveHint}
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-base font-semibold">
          {t(lang, "Find and assign a member", "Buscar y asignar un miembro")}
        </h2>
       

        <div className="mt-4" suppressHydrationWarning>
          <MemberSearchInput
            id="member-search"
            lang={lang}
            value={search}
            onChange={(next) => {
              setSearch(next);
              setSelectedMemberId(null);
            }}
          />
        </div>

        {query ? (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-border bg-background">
            {searchResults.length === 0 ? (
              <li className="px-3 py-3 text-sm text-foreground/50">
                {t(lang, "No members match your search.", "Ningún miembro coincide con la búsqueda.")}
              </li>
            ) : (
              searchResults.map((m) => {
                const inRoles = rolesForMember(m.id);
                const isSelected = selectedMemberId === m.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(m.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-hover ${
                        isSelected ? "bg-surface-hover font-medium" : ""
                      }`}
                    >
                      <span>{m.name}</span>
                      {inRoles.length > 0 ? (
                        <span className="shrink-0 text-xs text-foreground/50">
                          {inRoles
                            .map((r) =>
                              lang === "es" ? sacramentRoleLabel(r, lang).es : sacramentRoleLabel(r, lang).en,
                            )
                            .join(" · ")}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        ) : null}

        {selectedMember ? (
          <div className="mt-4 rounded-lg border border-border bg-background/60 p-4">
            <p className="text-sm font-medium text-foreground">
              {t(lang, "Selected", "Seleccionado")}:{" "}
              <span className="font-semibold">{selectedMember.name}</span>
            </p>
            <p className="mt-1 text-xs text-foreground/55">{t(lang, "Assign to role", "Asignar al cargo")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SACRAMENT_ROLE_KEYS.map((role) => {
                const label = sacramentRoleLabel(role, lang);
                const title = lang === "es" ? label.es : label.en;
                const already = rolePool[role].includes(selectedMember.id);
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={already}
                    onClick={() => assignSelected(role)}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:bg-surface-hover disabled:cursor-default disabled:opacity-50"
                    title={
                      already
                        ? t(lang, "Already in this role", "Ya está en este cargo")
                        : t(lang, `Add to ${title}`, `Agregar a ${title}`)
                    }
                  >
                    {already ? `✓ ${title}` : `+ ${title}`}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{t(lang, "Role sections", "Secciones por cargo")}</h2>
          <span className="text-sm text-foreground/55">
            {t(lang, `${totalAssigned} members assigned`, `${totalAssigned} miembros asignados`)}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SACRAMENT_ROLE_KEYS.map((role) => {
            const label = sacramentRoleLabel(role, lang);
            const title = lang === "es" ? label.es : label.en;
            const count = rolePool[role].length;

            return (
              <section
                key={role}
                className="flex min-h-[8rem] flex-col overflow-visible rounded-xl border border-border bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{title}</h3>
                  <span className="shrink-0 rounded-full bg-foreground/10 px-2.5 py-0.5 text-xs font-medium tabular-nums">
                    {count}
                  </span>
                </div>
                <div className="mt-3 flex-1 overflow-visible">
                  <RolePoolDraggableList
                    role={role}
                    memberIds={rolePool[role]}
                    memberNameById={memberNameById}
                    emptyLabel={t(lang, "No members yet.", "Sin miembros aún.")}
                    removeLabel={t(lang, "Remove", "Quitar")}
                    onRemove={(memberId) => removeMember(role, memberId)}
                    onReorder={(start, finish) => reorderMembers(role, start, finish)}
                  />
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
