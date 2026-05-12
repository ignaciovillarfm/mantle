"use client";

import { useMemo, useState } from "react";

export type OrganizationDiagramGroup = {
  key: string;
  label: string;
  rows: { id: string; title: string; memberName: string | null }[];
};

function RoleCard({ title, name }: { title: string; name: string | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-3 text-center shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45">{title}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{name?.trim() ? name : "Unassigned"}</div>
    </div>
  );
}

export function OrganizationGroupsModal({
  wardId,
  groups,
}: {
  wardId: string;
  groups: OrganizationDiagramGroup[];
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const openGroup = useMemo(() => groups.find((g) => g.key === openKey) ?? null, [groups, openKey]);

  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "org-modal-debug-1",
      hypothesisId: "H12",
      location: "OrganizationGroupsModal.tsx:render",
      message: "Rendered organization title chips for modal flow",
      data: { wardId, groupCount: groups.length, labels: groups.map((g) => g.label) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <>
      <div className="rounded-lg border border-border bg-background p-3">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">Organizations</h4>
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm text-foreground/80 hover:bg-foreground/5"
              onClick={() => {
                setOpenKey(group.key);
                // #region agent log
                fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
                  body: JSON.stringify({
                    sessionId: "812a29",
                    runId: "org-modal-debug-1",
                    hypothesisId: "H13",
                    location: "OrganizationGroupsModal.tsx:openModal",
                    message: "Opened organization diagram modal",
                    data: { wardId, groupKey: group.key, label: group.label, rowCount: group.rows.length },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {openGroup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenKey(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="org-diagram-modal-title"
            className="max-h-[min(90vh,680px)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 id="org-diagram-modal-title" className="text-lg font-semibold tracking-tight">
                {openGroup.label}
              </h3>
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-sm text-foreground/55 hover:bg-foreground/10 hover:text-foreground"
                onClick={() => setOpenKey(null)}
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {openGroup.rows.map((row) => (
                <RoleCard key={row.id} title={row.title} name={row.memberName} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
