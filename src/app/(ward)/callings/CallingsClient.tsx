"use client";

import { useOnline } from "@/hooks/useOnline";
import { useEffect, useMemo, useState } from "react";
import {
  AddCallingModal,
  type CallingMemberOption,
  type CallingPresetOption,
} from "@/app/(ward)/callings/AddCallingModal";

const WORKFLOW_STEPS = ["Proposed", "Extended", "Accepted", "To Sustain", "Set Apart"] as const;

function normalizeStatusForUi(status: string): (typeof WORKFLOW_STEPS)[number] | null {
  if (status === "In Prayer") return "Extended";
  if (status === "Stake Approval" || status === "To Interview") return "Accepted";
  if ((WORKFLOW_STEPS as readonly string[]).includes(status)) {
    return status as (typeof WORKFLOW_STEPS)[number];
  }
  return null;
}

function mapUiStepToLegacyApiStatus(step: (typeof WORKFLOW_STEPS)[number]): string {
  if (step === "Extended") return "In Prayer";
  if (step === "Accepted") return "To Interview";
  return step;
}

export type CallingRow = {
  id: string;
  ward_id: string;
  wardName: string;
  name: string;
  status: string;
  member_id: string;
  members: { name: string } | null;
  nextStatus: string | null;
};

type GroupDef = { key: string; label: string };

const GROUP_ORDER: GroupDef[] = [
  { key: "bishopric", label: "Bishopric & Clerks" },
  { key: "elders_quorum", label: "Elders Quorum" },
  { key: "relief_society", label: "Relief Society" },
  { key: "young_men", label: "Young Men" },
  { key: "young_women", label: "Young Women" },
  { key: "primary", label: "Primary" },
  { key: "sunday_school", label: "Sunday School" },
  { key: "mission_tfh", label: "Mission & Family History" },
  { key: "other", label: "Other" },
];

function inferCallingGroup(name: string): GroupDef["key"] {
  const t = name.trim().toLowerCase();
  if (
    t.includes("bishop") ||
    t.includes("clerk") ||
    t.includes("executive secretary")
  ) {
    return "bishopric";
  }
  if (t.includes("elders quorum") || t.includes("eq ")) return "elders_quorum";
  if (t.includes("relief society") || t.includes("rs ")) return "relief_society";
  if (t.includes("young men")) return "young_men";
  if (t.includes("young women")) return "young_women";
  if (t.includes("primary")) return "primary";
  if (t.includes("sunday school")) return "sunday_school";
  if (t.includes("mission") || t.includes("family history") || t.includes("temple")) return "mission_tfh";
  return "other";
}

export function CallingsClient({
  wards,
  defaultWardId,
  positions,
  members,
  callings,
  title = "Callings",
  showAddModal = true,
  allowStatusAdvance = true,
  allowDeleteProposed = false,
  addModalInitialStatus = "Set Apart",
  addModalButtonLabel = "Add calling",
  addModalTitle = "Assign calling",
}: {
  wards: { id: string; name: string }[];
  defaultWardId: string | null;
  positions: CallingPresetOption[];
  members: CallingMemberOption[];
  callings: CallingRow[];
  title?: string;
  showAddModal?: boolean;
  allowStatusAdvance?: boolean;
  allowDeleteProposed?: boolean;
  addModalInitialStatus?: "Set Apart" | "Proposed";
  addModalButtonLabel?: string;
  addModalTitle?: string;
}) {
  const online = useOnline();
  const [items, setItems] = useState(callings);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(callings);
  }, [callings]);

  const canMutate = online;

  const grouped = useMemo(() => {
    const byGroup = new Map<GroupDef["key"], CallingRow[]>();
    for (const it of items) {
      const g = inferCallingGroup(it.name);
      const arr = byGroup.get(g) ?? [];
      arr.push(it);
      byGroup.set(g, arr);
    }
    for (const arr of byGroup.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name) || (a.members?.name ?? "").localeCompare(b.members?.name ?? ""));
    }
    return GROUP_ORDER.map((g) => ({ ...g, rows: byGroup.get(g.key) ?? [] })).filter((g) => g.rows.length > 0);
  }, [items]);

  async function advance(id: string, target: string) {
    setBusy(id);
    setErr(null);
    try {
      const apiTarget = mapUiStepToLegacyApiStatus(target as (typeof WORKFLOW_STEPS)[number]);
      const res = await fetch("/api/edge/advance-calling-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calling_id: id, new_status: apiTarget }),
      });
      const text = await res.text();
      if (!res.ok) {
        try {
          const parsed = JSON.parse(text) as { error?: string };
          throw new Error(parsed.error ?? text);
        } catch {
          throw new Error(text);
        }
      }
      const json = JSON.parse(text) as {
        status?: string;
        next_status_after?: string | null;
      };
      const newStatus = json.status;
      const nextAfter = json.next_status_after ?? null;
      if (!newStatus) throw new Error("Invalid response");
      setItems((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: newStatus, nextStatus: nextAfter } : c,
        ),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function removeProposed(id: string) {
    setBusy(id);
    setErr(null);
    try {
      const res = await fetch("/api/callings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ callingId: id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `Delete failed (${res.status})`);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {showAddModal ? (
          <AddCallingModal
            wards={wards}
            defaultWardId={defaultWardId}
            positions={positions}
            members={members}
            initialStatus={addModalInitialStatus}
            buttonLabel={addModalButtonLabel}
            modalTitle={addModalTitle}
          />
        ) : null}
      </div>
      {!canMutate && (
        <p className="text-sm text-warning">You are offline — status changes are disabled.</p>
      )}
      {err && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {err}
        </p>
      )}
      {grouped.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-8 text-center text-foreground/50">
          No callings yet.
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.key} className="rounded-xl border border-border bg-surface">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wide text-foreground/60">
              {group.label}
            </h2>
            <ul className="divide-y divide-border">
              {group.rows.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-foreground/60">
                      {c.members?.name ?? "Member"} · {c.wardName} · {normalizeStatusForUi(c.status) ?? c.status}
                    </div>
                    {allowStatusAdvance ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {WORKFLOW_STEPS.map((step, idx) => {
                          const normalized = normalizeStatusForUi(c.status);
                          const currentIdx = normalized ? WORKFLOW_STEPS.indexOf(normalized) : -1;
                          const done = currentIdx >= idx;
                          const nextClickable = allowStatusAdvance && currentIdx >= 0 && idx === currentIdx + 1;
                          return (
                            <button
                              key={`${c.id}-${step}`}
                              type="button"
                              disabled={!nextClickable || !canMutate || busy === c.id}
                              onClick={() => void advance(c.id, step)}
                              className={`rounded-full border px-2 py-0.5 text-xs ${
                                done
                                  ? "border-green-700 bg-green-50 text-green-800"
                                  : "border-border bg-background text-foreground/70"
                              } ${nextClickable ? "hover:bg-surface-hover" : "cursor-default"}`}
                              title={step}
                            >
                              {done ? "✓ " : ""}
                              {step}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {allowDeleteProposed && c.status !== "Set Apart" ? (
                      <button
                        type="button"
                        disabled={!canMutate || busy === c.id}
                        onClick={() => void removeProposed(c.id)}
                        className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-40"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
