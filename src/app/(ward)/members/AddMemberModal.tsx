"use client";

import { AppModal } from "@/components/AppModal";
import { useCallback, useState } from "react";
import { AddMemberForm } from "./AddMemberForm";

export function AddMemberModal({
  ward,
  callingOptions,
  onMemberCreated,
  triggerLabel,
}: {
  /** Ward context for new members (same ward as this directory scope). */
  ward: { id: string; name: string } | null;
  callingOptions: { id: string; title: string }[];
  onMemberCreated?: (member: { id: string; name: string }) => void;
  /** Optional visible label next to the + button (default: icon only). */
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  const canAdd = Boolean(ward);

  return (
    <>
      <button
        type="button"
        aria-label="Add member"
        title={canAdd ? "Add member" : "You need a ward leadership role to add members"}
        disabled={!canAdd}
        onClick={() => setOpen(true)}
        className={
          triggerLabel
            ? "inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 disabled:cursor-not-allowed disabled:opacity-40"
            : "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xl font-light leading-none text-foreground shadow-sm transition-colors hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        <span aria-hidden="true" className={triggerLabel ? "text-base leading-none" : undefined}>
          +
        </span>
        {triggerLabel ? <span>{triggerLabel}</span> : null}
      </button>

      {ward ? (
        <AppModal
          open={open}
          onClose={close}
          size="sm"
          title="Add member"
          titleId="add-member-modal-title"
          closeLabel="Close"
        >
          <p className="mb-6 text-sm leading-relaxed text-foreground/55">
            They will appear in this directory. Sacrament speaking and prayer assignments are set on the Sacrament
            page.
          </p>
          <AddMemberForm
            wardId={ward.id}
            callingOptions={callingOptions}
            onSuccess={(member) => {
              onMemberCreated?.(member);
              close();
            }}
          />
        </AppModal>
      ) : null}
    </>
  );
}
