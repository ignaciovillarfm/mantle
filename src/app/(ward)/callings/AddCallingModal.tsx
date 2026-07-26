"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { groupCallingOptions } from "@/lib/callings/groupCallingOptions";
import { CreateCallingPositionFields } from "@/app/(ward)/sacrament/CreateCallingPositionFields";

export type CallingPresetOption = { id: string; ward_id: string; title: string; sort_order: number };
export type CallingMemberOption = { id: string; ward_id: string; name: string };

export function AddCallingModal({
  wards,
  positions,
  members,
  defaultWardId,
  initialStatus = "Set Apart",
  buttonLabel = "Add calling",
  modalTitle = "Assign calling",
}: {
  wards: { id: string; name: string }[];
  positions: CallingPresetOption[];
  members: CallingMemberOption[];
  defaultWardId: string | null;
  initialStatus?: "Set Apart" | "Proposed";
  buttonLabel?: string;
  modalTitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [wardId, setWardId] = useState(defaultWardId ?? wards[0]?.id ?? "");
  const [memberId, setMemberId] = useState("");
  const [positionId, setPositionId] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setErr(null);
    setMemberId("");
    setPositionId("");
  }, []);

  const memberOptions = useMemo(() => {
    return members
      .filter((m) => m.ward_id === wardId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [members, wardId]);

  const presetOptions = useMemo(() => {
    return positions
      .filter((p) => p.ward_id === wardId)
      .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  }, [positions, wardId]);

  const groupedPresetOptions = useMemo(() => {
    return groupCallingOptions(presetOptions);
  }, [presetOptions]);

  useEffect(() => {
  }, [groupedPresetOptions, wardId]);

  const canUse = wards.length > 0;

  const submitAssign = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErr(null);
      if (!wardId || !memberId || !positionId) {
        setErr("Choose ward, member, and calling.");
        return;
      }

      setBusy(true);
      try {
        const res = await fetch("/api/callings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            wardId,
            memberId,
            callingPositionId: positionId,
            status: initialStatus,
          }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setErr(typeof json.error === "string" ? json.error : `Save failed (${res.status})`);
          return;
        }
        close();
        router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [wardId, memberId, positionId, initialStatus, close, router],
  );

  return (
    <>
      <button
        type="button"
        disabled={!canUse}
        title={canUse ? "Add calling for a member" : "You need ward leadership access"}
        aria-label="Add calling"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium shadow-sm hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {buttonLabel}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-calling-modal-title"
            className="max-h-[min(92vh,560px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="add-calling-modal-title" className="text-xl font-semibold tracking-tight">
                {modalTitle}
              </h2>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg px-2.5 py-1.5 text-sm text-foreground/55 hover:bg-foreground/10 hover:text-foreground"
                onClick={close}
              >
                Close
              </button>
            </div>

            <form className="space-y-5" onSubmit={submitAssign}>
              {wards.length > 1 ? (
                <div>
                  <label htmlFor="assign-ward" className="mb-1.5 block text-sm font-medium">
                    Ward
                  </label>
                  <select
                    id="assign-ward"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={wardId}
                    onChange={(e) => {
                      setWardId(e.target.value);
                      setMemberId("");
                      setPositionId("");
                    }}
                  >
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label htmlFor="assign-member" className="mb-1.5 block text-sm font-medium">
                  Member
                </label>
                <select
                  id="assign-member"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  disabled={!wardId}
                >
                  <option value="">— Select member —</option>
                  {memberOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="assign-position" className="mb-1.5 block text-sm font-medium">
                  Calling
                </label>
                <select
                  id="assign-position"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  disabled={!wardId}
                >
                  <option value="">— Choose calling —</option>
                  {groupedPresetOptions.map((group) => (
                    <optgroup key={group.key} label={group.label}>
                      {group.options.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {wardId ? (
                  <div className="mt-2">
                    <CreateCallingPositionFields
                      lang="en"
                      wardId={wardId}
                      onCreated={(pos) => {
                        setPositionId(pos.id);
                        router.refresh();
                      }}
                    />
                  </div>
                ) : null}
              </div>

              {err ? <p className="text-sm text-red-600">{err}</p> : null}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-foreground py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-6"
              >
                {busy ? "Saving…" : "Save assignment"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
