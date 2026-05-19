import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-input bg-input-bg px-3.5 py-3 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-[var(--placeholder)] hover:border-primary/50 focus-visible:border-primary focus-visible:bg-white focus-visible:shadow-[var(--shadow-focus)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[4px] aria-invalid:ring-destructive/15 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
