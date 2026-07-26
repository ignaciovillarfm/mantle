import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import { cn } from "@/lib/utils";

export type BishopricSlots = {
  bishop: string | null;
  firstCounselor: string | null;
  secondCounselor: string | null;
  wardClerk: string | null;
  assistantWardClerk: string | null;
  wardExecutiveSecretary: string | null;
};

function RoleCard({ title, name }: { title: string; name: string | null }) {
  const assigned = Boolean(name?.trim());
  const display = assigned ? name!.trim() : "Unassigned";

  return (
    <div
      className={cn(
        "relative z-10 flex w-full max-w-[11rem] flex-col items-center rounded-xl border px-3 py-3 text-center shadow-sm",
        assigned
          ? "border-border bg-surface"
          : "border-dashed border-border/70 bg-muted/20",
      )}
    >
      <span
        className={cn(
          "mb-2 flex size-10 items-center justify-center rounded-full text-xs font-semibold",
          assigned ? "bg-primary/15 text-primary" : "bg-muted text-foreground/35",
        )}
        aria-hidden
      >
        {assigned ? userInitialsFromDisplayName(display) : "—"}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
        {title}
      </span>
      <span
        className={cn(
          "mt-1 line-clamp-2 text-sm font-medium leading-snug",
          assigned ? "text-foreground" : "italic text-foreground/40",
        )}
      >
        {display}
      </span>
    </div>
  );
}

/** Org-chart layout: bishop above, counselors side by side, then clerical roles below. */
export function BishopricDiagram({ slots }: { slots: BishopricSlots }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/20 to-background">
      <div className="border-b border-border/60 px-4 py-3 text-center">
        <h3 className="text-sm font-semibold text-foreground">Bishopric &amp; Clerical</h3>
        <p className="mt-0.5 text-xs text-foreground/50">Current active callings</p>
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-border"
          aria-hidden
        >
          <line x1="50%" y1="18%" x2="50%" y2="28%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="25%" y1="28%" x2="75%" y2="28%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="25%" y1="28%" x2="25%" y2="34%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="75%" y1="28%" x2="75%" y2="34%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50%" y1="48%" x2="50%" y2="56%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="50%" y1="68%" x2="50%" y2="76%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="25%" y1="76%" x2="75%" y2="76%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="25%" y1="76%" x2="25%" y2="82%" stroke="currentColor" strokeWidth="1.5" />
          <line x1="75%" y1="76%" x2="75%" y2="82%" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <div className="relative grid grid-cols-2 gap-x-6 gap-y-8">
          <div className="col-span-2 flex justify-center">
            <RoleCard title="Bishop" name={slots.bishop} />
          </div>

          <div className="flex justify-center">
            <RoleCard title="First Counselor" name={slots.firstCounselor} />
          </div>
          <div className="flex justify-center">
            <RoleCard title="Second Counselor" name={slots.secondCounselor} />
          </div>

          <div className="col-span-2 flex justify-center">
            <RoleCard title="Ward Clerk" name={slots.wardClerk} />
          </div>

          <div className="flex justify-center">
            <RoleCard title="Assistant Ward Clerk" name={slots.assistantWardClerk} />
          </div>
          <div className="flex justify-center">
            <RoleCard title="Ward Executive Secretary" name={slots.wardExecutiveSecretary} />
          </div>
        </div>
      </div>
    </div>
  );
}
