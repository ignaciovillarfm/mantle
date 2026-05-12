"use client";

import { useCallback, useEffect, useState } from "react";
import { AddMemberForm } from "./AddMemberForm";

export function AddMemberModal({
  ward,
  callingOptions,
}: {
  /** Ward context for new members (same ward as this directory scope). */
  ward: { id: string; name: string } | null;
  callingOptions: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);

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
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-xl font-light leading-none text-foreground shadow-sm transition-colors hover:bg-foreground/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">+</span>
      </button>

      {open && ward ? (
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
            aria-labelledby="add-member-modal-title"
            className="max-h-[min(90vh,520px)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <h2 id="add-member-modal-title" className="text-xl font-semibold tracking-tight">
                Add member
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
            <p className="mb-6 text-sm leading-relaxed text-foreground/55">
              They will appear in this directory. Sacrament speaking and prayer assignments are set on the Sacrament
              page.
            </p>
            <AddMemberForm wardId={ward.id} callingOptions={callingOptions} onSuccess={close} />
          </div>
        </div>
      ) : null}
    </>
  );
}
