"use client";

import {
  BISHOPRIC_ORG_BANDS,
  type BishopricSlots,
  type OrgRoleNode,
} from "@/lib/bishopric/bishopricOrgSchema";
import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import { cn } from "@/lib/utils";

export type { BishopricSlots };

const LINE = "bg-[color-mix(in_srgb,var(--border-medium)_75%,transparent)]";

function RoleCard({
  title,
  name,
  size = "md",
}: {
  title: string;
  name: string | null;
  size?: "lg" | "md" | "sm";
}) {
  const assigned = Boolean(name?.trim());
  const display = assigned ? name!.trim() : null;

  return (
    <article
      className={cn(
        "relative z-10 flex w-full items-center text-left transition-transform duration-300 ease-out",
        size === "lg" && "max-w-[22rem] gap-3.5 rounded-[1.25rem] px-5 py-4",
        size === "md" && "max-w-[17.5rem] gap-3 rounded-2xl px-4 py-3",
        size === "sm" && "max-w-[15.5rem] gap-2.5 rounded-xl px-3.5 py-2.5",
        assigned
          ? "border border-border/70 bg-[var(--bg-card)] shadow-[var(--shadow-card)] hover:-translate-y-0.5"
          : "border border-dashed border-border/55 bg-transparent",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-semibold tracking-tight",
          size === "lg" && "size-12 text-sm",
          size === "md" && "size-10 text-xs",
          size === "sm" && "size-8 text-[11px]",
          assigned
            ? size === "lg"
              ? "bg-primary text-primary-foreground"
              : "bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-primary"
            : "bg-muted/60 text-foreground/30",
        )}
        aria-hidden
      >
        {display ? userInitialsFromDisplayName(display) : "—"}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "font-semibold uppercase tracking-[0.16em] text-foreground/40",
            size === "lg" ? "text-[11px]" : "text-[10px]",
          )}
        >
          {title}
        </p>
        {display ? (
          <p
            className={cn(
              "mt-0.5 truncate font-medium leading-snug tracking-tight text-foreground",
              size === "lg" && "text-base sm:text-[1.05rem]",
              size === "md" && "text-sm",
              size === "sm" && "text-[13px]",
            )}
            title={display}
          >
            {display}
          </p>
        ) : (
          <p className="mt-0.5 text-[13px] italic text-foreground/35">Open</p>
        )}
      </div>
    </article>
  );
}

function BandRule({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-4 py-1" role="presentation">
      <div className={cn("h-px flex-1", LINE)} />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/35">
        {label}
      </span>
      <div className={cn("h-px flex-1", LINE)} />
    </div>
  );
}

/** Vertical segment — always centered in its parent. */
function VLine({ className }: { className?: string }) {
  return <div className={cn("mx-auto w-px shrink-0", LINE, className)} aria-hidden />;
}

/**
 * Classic CSS org fork: spine → crossbar through midpoints of two equal columns.
 * Lines are real boxes tied to flex layout, so they stay centered on the cards.
 */
function CounselorFork({
  left,
  right,
  slots,
}: {
  left: OrgRoleNode;
  right: OrgRoleNode;
  slots: BishopricSlots;
}) {
  return (
    <div className="flex w-full max-w-2xl flex-col items-center">
      <VLine className="h-5" />
      <div className="relative grid w-full grid-cols-2">
        {/* Crossbar: from center of left col to center of right col */}
        <div
          className={cn("pointer-events-none absolute top-0 right-1/4 left-1/4 h-px", LINE)}
          aria-hidden
        />
        <div className="flex flex-col items-center">
          <VLine className="h-5" />
          <RoleCard title={left.title} name={slots[left.key]} />
        </div>
        <div className="flex flex-col items-center">
          <VLine className="h-5" />
          <RoleCard title={right.title} name={slots[right.key]} />
        </div>
      </div>
    </div>
  );
}

function ClericalPeers({
  clerk,
  executive,
  assistant,
  slots,
}: {
  clerk: OrgRoleNode;
  executive: OrgRoleNode;
  assistant: OrgRoleNode;
  slots: BishopricSlots;
}) {
  return (
    <div className="grid w-full max-w-2xl grid-cols-2 items-start gap-x-4 sm:gap-x-8">
      <div className="flex flex-col items-center">
        <RoleCard title={clerk.title} name={slots[clerk.key]} />
        <VLine className="h-5" />
        <RoleCard title={assistant.title} name={slots[assistant.key]} size="sm" />
      </div>
      <div className="flex flex-col items-center">
        <RoleCard title={executive.title} name={slots[executive.key]} />
      </div>
    </div>
  );
}

/** Handbook-correct bishopric & clerical org chart. */
export function BishopricDiagram({ slots }: { slots: BishopricSlots }) {
  const bishopric = BISHOPRIC_ORG_BANDS.find((b) => b.id === "bishopric");
  const clerical = BISHOPRIC_ORG_BANDS.find((b) => b.id === "clerical");

  return (
    <section
      data-bishopric-diagram
      className="w-full overflow-hidden rounded-[1.35rem] border border-border/80 bg-[var(--bg-card)]"
    >
      <header className="px-5 pt-5 sm:px-7 sm:pt-6">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Bishopric &amp; Clerical
        </h3>
      </header>

      <div
        className="relative mx-auto flex w-full flex-col items-center px-4 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-7"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--muted) 55%, transparent), transparent 70%)",
        }}
      >
        {bishopric ? (
          <div className="flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col items-center duration-500">
            <BandRule label={bishopric.label} />
            <div className="mt-5 flex w-full flex-col items-center">
              <RoleCard
                title={bishopric.root.title}
                name={slots[bishopric.root.key]}
                size="lg"
              />
              {bishopric.branches[0] && bishopric.branches[1] ? (
                <CounselorFork
                  left={bishopric.branches[0]}
                  right={bishopric.branches[1]}
                  slots={slots}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {clerical?.peer && clerical.branches[0] ? (
          <div className="mt-10 flex w-full animate-in fade-in slide-in-from-bottom-2 flex-col items-center duration-700">
            <BandRule label={clerical.label} />
            <div className="mt-5 flex w-full justify-center">
              <ClericalPeers
                clerk={clerical.root}
                executive={clerical.peer}
                assistant={clerical.branches[0]}
                slots={slots}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
