"use client";

import { AppModal } from "@/components/AppModal";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type EditableMember = {
  id: string;
  name: string;
  is_youth: boolean;
};

export function EditMemberModal({
  member,
  onClose,
}: {
  member: EditableMember | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isYouth, setIsYouth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setName(member.name);
    setIsYouth(member.is_youth);
    setError(null);
  }, [member]);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!member) return;
      const trimmed = name.trim();
      if (!trimmed) {
        setError("Enter the member's name.");
        return;
      }

      setError(null);
      setBusy(true);
      try {
        const res = await fetch("/api/members", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ id: member.id, name: trimmed, isYouth }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setError(json.error ?? `Save failed (${res.status})`);
          return;
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setBusy(false);
      }
    },
    [member, name, isYouth, router, onClose],
  );

  if (!member) return null;

  return (
    <AppModal
      open
      onClose={onClose}
      size="sm"
      title="Edit member"
      titleId="edit-member-modal-title"
      closeLabel="Close"
    >
      <p className="mb-6 text-sm leading-relaxed text-foreground/55">
        Correct the name or the youth flag. Callings and sacrament assignments are managed on their
        own pages.
      </p>

      <form className="flex flex-col gap-5" onSubmit={submit}>
        <div>
          <label
            htmlFor="edit-member-name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Full name
          </label>
          <input
            id="edit-member-name"
            type="text"
            autoFocus
            required
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm shadow-sm outline-none ring-foreground/15 transition-shadow focus:ring-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="min-w-32 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </AppModal>
  );
}
