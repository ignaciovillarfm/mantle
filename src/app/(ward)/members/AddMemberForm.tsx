"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { groupCallingOptions } from "@/lib/callings/groupCallingOptions";

export function AddMemberForm({
  wardId,
  callingOptions,
  onSuccess,
}: {
  wardId: string;
  callingOptions: { id: string; title: string }[];
  onSuccess?: (member: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isYouth, setIsYouth] = useState(false);
  const [callingPositionId, setCallingPositionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groupedCallingOptions = useMemo(() => groupCallingOptions(callingOptions), [callingOptions]);

  useEffect(() => {
  }, [groupedCallingOptions, wardId]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const fn = firstName.trim();
      const ln = lastName.trim();
      if (!fn || !ln) {
        setError("Enter first and last name.");
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            wardId,
            firstName: fn,
            lastName: ln,
            isYouth,
            callingPositionId: callingPositionId || null,
          }),
        });
        const json = (await res.json()) as { ok: boolean; error?: string; id?: string };
        if (!res.ok || !json.ok) {
          setError(typeof json.error === "string" ? json.error : `Save failed (${res.status})`);
          return;
        }
        const created = { id: json.id as string, name: `${fn} ${ln}` };
        setFirstName("");
        setLastName("");
        setIsYouth(false);
        setCallingPositionId("");
        router.refresh();
        onSuccess?.(created);
      } finally {
        setBusy(false);
      }
    },
    [wardId, firstName, lastName, isYouth, callingPositionId, router, onSuccess],
  );

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="add-member-first" className="mb-1.5 block text-sm font-medium text-foreground">
            First name
          </label>
          <input
            id="add-member-first"
            name="given-name"
            type="text"
            autoComplete="given-name"
            autoFocus
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="e.g. Jane"
          />
        </div>
        <div>
          <label htmlFor="add-member-last" className="mb-1.5 block text-sm font-medium text-foreground">
            Last name
          </label>
          <input
            id="add-member-last"
            name="family-name"
            type="text"
            autoComplete="family-name"
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="e.g. Rivera"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-1 py-1 text-sm hover:bg-foreground/3">
        <input
          type="checkbox"
          checked={isYouth}
          onChange={(e) => setIsYouth(e.target.checked)}
          className="size-4 rounded border-border text-foreground accent-foreground"
        />
        <span>Youth (under 18)</span>
      </label>

      <div>
        <label htmlFor="add-member-calling" className="mb-1.5 block text-sm font-medium text-foreground">
          Calling (optional)
        </label>
        <select
          id="add-member-calling"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
          value={callingPositionId}
          onChange={(e) => setCallingPositionId(e.target.value)}
        >
          <option value="">— None —</option>
          {groupedCallingOptions.map((group) => (
            <optgroup key={group.key} label={group.label}>
              {group.options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={busy}
          className="min-w-32 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add member"}
        </button>
      </div>
    </form>
  );
}
