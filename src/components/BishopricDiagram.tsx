export type BishopricSlots = {
  bishop: string | null;
  firstCounselor: string | null;
  secondCounselor: string | null;
  wardClerk: string | null;
  assistantWardClerk: string | null;
  wardExecutiveSecretary: string | null;
};

function RoleCard({ title, name }: { title: string; name: string | null }) {
  const display = name?.trim() ? name : "Unassigned";
  return (
    <div className="flex min-h-18 w-full max-w-44 flex-col justify-center justify-self-center rounded-xl border border-border bg-surface px-3 py-2 text-center shadow-sm">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">{title}</span>
      <span className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">{display}</span>
    </div>
  );
}

/** Org-chart layout: bishop above, counselors side by side, then clerical roles below. */
export function BishopricDiagram({ slots }: { slots: BishopricSlots }) {
  return (
    <div className="rounded-lg border border-border bg-background/90 p-4 sm:p-6">
      <h3 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-foreground/60">
        Current Bishopric and Clerical  
      </h3>

      <div className="relative mx-auto grid w-full max-w-2xl grid-cols-2 gap-x-4 gap-y-4 rounded-xl bg-muted/15 p-4 ring-1 ring-border/60 sm:gap-y-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-border/80"
          aria-hidden
        />

        <div className="relative z-1 col-span-2 flex justify-center">
          <RoleCard title="Bishop" name={slots.bishop} />
        </div>

        <div className="relative z-1 flex justify-center">
          <RoleCard title="First Counselor" name={slots.firstCounselor} />
        </div>
        <div className="relative z-1 flex justify-center">
          <RoleCard title="Second Counselor" name={slots.secondCounselor} />
        </div>

        <div className="relative z-1 col-span-2 flex justify-center">
          <RoleCard title="Ward Clerk" name={slots.wardClerk} />
        </div>

        <div className="relative z-1 flex justify-center">
          <RoleCard title="Assistant Ward Clerk" name={slots.assistantWardClerk} />
        </div>
        <div className="relative z-1 flex justify-center">
          <RoleCard title="Ward Executive Secretary" name={slots.wardExecutiveSecretary} />
        </div>
      </div>
    </div>
  );
}
