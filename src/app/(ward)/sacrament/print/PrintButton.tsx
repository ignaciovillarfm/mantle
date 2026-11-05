"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Printer } from "lucide-react";

export function PrintButton({
  label,
  documentTitle,
  className,
  iconOnly,
  onClick,
}: {
  label: string;
  documentTitle: string;
  className?: string;
  /** Icon-only control (label used as accessible name). */
  iconOnly?: boolean;
  /** Override default print behavior (still receives a click). */
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="default"
      className={cn(iconOnly ? "size-9 shrink-0 px-0" : "h-9! gap-1.5 rounded-lg! px-3", className)}
      aria-label={label}
      title={label}
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        document.title = documentTitle;
        window.print();
      }}
    >
      <Printer className="size-4 shrink-0" aria-hidden />
      {iconOnly ? null : <span>{label}</span>}
    </Button>
  );
}
