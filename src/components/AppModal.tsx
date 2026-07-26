"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
} as const;

export function AppModal({
  open,
  onClose,
  title,
  titleId = "app-modal-title",
  description,
  children,
  footer,
  size = "lg",
  sheetOnMobile = false,
  closeLabel = "Close",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASS;
  sheetOnMobile?: boolean;
  closeLabel?: string;
}) {
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
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    // Capture so nested AppModal closes before an underlying Dialog.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[110] flex justify-center bg-black/45 p-4 ${
        sheetOnMobile ? "items-end sm:items-center" : "items-center"
      }`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[min(90vh,720px)] w-full overflow-y-auto rounded-xl border border-border bg-surface p-4 shadow-lg sm:rounded-2xl sm:p-6 ${SIZE_CLASS[size]}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </h2>
            {description ? <div className="mt-1 text-sm text-foreground/70">{description}</div> : null}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            className="shrink-0 rounded-lg px-2.5 py-1.5 text-sm text-foreground/55 hover:bg-foreground/10 hover:text-foreground"
            onClick={onClose}
          >
            {closeLabel}
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 border-t border-border pt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
