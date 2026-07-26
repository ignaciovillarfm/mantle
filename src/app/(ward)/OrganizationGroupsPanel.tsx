"use client";

import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export type OrganizationDiagramGroup = {
  key: string;
  label: string;
  rows: { id: string; title: string; memberName: string | null }[];
};

function RoleCard({ title, name }: { title: string; name: string | null }) {
  const assigned = Boolean(name?.trim());
  const display = assigned ? name!.trim() : "Unassigned";

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors",
        assigned
          ? "border-border bg-surface shadow-sm"
          : "border-dashed border-border/70 bg-muted/15",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          assigned
            ? "bg-primary/15 text-primary"
            : "bg-muted text-foreground/35",
        )}
        aria-hidden
      >
        {assigned ? userInitialsFromDisplayName(display) : "—"}
      </span>
      <div className="min-w-0 text-left">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">
          {title}
        </div>
        <div
          className={cn(
            "mt-0.5 truncate text-sm font-medium",
            assigned ? "text-foreground" : "italic text-foreground/40",
          )}
        >
          {display}
        </div>
      </div>
    </div>
  );
}

export function OrganizationGroupsPanel({ groups }: { groups: OrganizationDiagramGroup[] }) {
  const [activeKey, setActiveKey] = useState(groups[0]?.key ?? "");
  const activeGroup = useMemo(
    () => groups.find((g) => g.key === activeKey) ?? groups[0] ?? null,
    [groups, activeKey],
  );

  if (groups.length === 0) return null;

  const assignedCount = activeGroup?.rows.filter((r) => r.memberName?.trim()).length ?? 0;
  const totalCount = activeGroup?.rows.length ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border bg-muted/25 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Organizations</h4>
          {activeGroup ? (
            <span className="text-xs text-foreground/50">
              {assignedCount} of {totalCount} filled
            </span>
          ) : null}
        </div>
        <div
          className="mt-3 flex gap-1 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="Organization groups"
        >
          {groups.map((group) => {
            const active = group.key === activeKey;
            const filled = group.rows.filter((r) => r.memberName?.trim()).length;
            return (
              <button
                key={group.key}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-foreground/60 hover:bg-surface/70 hover:text-foreground",
                )}
                onClick={() => setActiveKey(group.key)}
              >
                {group.label}
                <span className="ml-1.5 text-xs font-normal text-foreground/40">
                  {filled}/{group.rows.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {activeGroup ? (
        <div className="p-4" role="tabpanel">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeGroup.rows.map((row) => (
              <RoleCard key={row.id} title={row.title} name={row.memberName} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
