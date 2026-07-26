import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cardElevationClassName, formControlClassName } from "@/lib/formControlStyles";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export { formControlClassName as sacramentFormControlClass };

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
    <Card id={id} className={cn(cardElevationClassName, "gap-0 scroll-mt-24 py-7", className)}>
      <CardHeader className={cn("px-7 pb-4", action ? "grid-cols-[1fr_auto]" : undefined)}>
        <CardTitle className="text-lg font-bold tracking-tight text-foreground">{title}</CardTitle>
        {description ? (
          <CardDescription className="text-text-secondary">{description}</CardDescription>
        ) : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="px-7 pt-0">{children}</CardContent>
    </Card>
  );
}

export function SacramentPauseSeparator({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-2">
      <Separator className="absolute inset-x-0 top-1/2 bg-input" />
      <span className="relative mx-auto bg-background px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
