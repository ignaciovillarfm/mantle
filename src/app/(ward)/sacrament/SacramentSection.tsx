import {
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Form controls on the paper sheet — light rules on white, not filled tiles.
 */
export const sacramentFormControlClass =
  "rounded-none border border-neutral-800/70 bg-white text-neutral-950 shadow-none transition-[border-color,box-shadow] duration-200 placeholder:text-neutral-400 hover:border-neutral-950 focus-visible:border-neutral-950 focus-visible:bg-white focus-visible:shadow-[0_0_0_3px_rgba(0,0,0,0.08)] focus-visible:ring-0";

/**
 * Portaled menus / dialogs opened from the paper (Select, Popover, Dialog, etc.).
 * Pair with `data-sacrament-paper` so ink-on-white tokens apply outside the sheet DOM.
 */
export const sacramentPaperOverlayClass =
  "rounded-none border border-neutral-800/70 bg-white text-neutral-950 shadow-lg ring-0";

export const sacramentPaperOverlayAttrs = {
  "data-sacrament-paper": "",
} as const;

/** Shared inset for paper dialogs (`p-0` shell + section padding). */
export const sacramentPaperModalHeaderClass =
  "shrink-0 space-y-1.5 border-b border-neutral-200 px-6 py-5 pr-14";
export const sacramentPaperModalBodyClass = "space-y-4 px-6 py-5";
export const sacramentPaperModalFooterClass =
  "mx-0 mb-0 shrink-0 rounded-none border-t border-neutral-200 bg-neutral-50 px-6 py-4 sm:flex-row sm:justify-end";

/** Outer white paper sheet (date switcher stays outside). */
export function SacramentPaper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-sacrament-paper=""
      className={cn(
        "flex flex-col gap-4 overflow-hidden rounded-sm border border-neutral-300 bg-white px-5 py-6 text-neutral-950 sm:gap-5 sm:px-8 sm:py-8",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** One bordered program block inside the paper (matches print section boxes). */
export function SacramentSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-2 space-y-3 border border-neutral-900 bg-white p-4 sm:p-5",
        className,
      )}
    >
      <CardHeader
        className={cn(
          "gap-1.5 bg-transparent p-0",
          action ? "grid-cols-[1fr_auto]" : undefined,
        )}
      >
        <CardTitle className="text-[15px] font-semibold uppercase tracking-wide text-neutral-950">
          {title}
        </CardTitle>
        {description ? (
          <CardDescription className="text-sm text-neutral-600">
            {description}
          </CardDescription>
        ) : null}
        {action ? <CardAction className="self-start">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="bg-transparent p-0">{children}</CardContent>
    </section>
  );
}

/** Compact pause marker between boxed sections (same idea as print). */
export function SacramentPauseSeparator({ label }: { label: string }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center gap-2 py-0.5 opacity-50"
      role="separator"
      aria-label={label}
    >
      <span className="block h-0 w-10 shrink-0 border-t border-neutral-500/50" aria-hidden />
      <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-600/80">
        {label}
      </span>
      <span className="block h-0 w-10 shrink-0 border-t border-neutral-500/50" aria-hidden />
    </div>
  );
}
