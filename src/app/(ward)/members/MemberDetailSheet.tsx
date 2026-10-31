"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ageFromBirthDate,
  formatBirthDate,
  genderDisplay,
  memberInitials,
} from "@/lib/members/memberProfile";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useState } from "react";
import type { MembersDirectoryRow } from "./memberDirectoryTypes";

function formatDelivered(v: boolean | null): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground/45">
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className="text-sm text-foreground/50">{label}</dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

type DetailTab = "overview" | "sacrament";

export function MemberDetailSheet({
  member,
  open,
  onClose,
  onEdit,
}: {
  member: MembersDirectoryRow | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (member: MembersDirectoryRow) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const age = member ? ageFromBirthDate(member.birth_date) : null;
  const birthLabel = member ? formatBirthDate(member.birth_date) : "—";

  return (
    <Sheet
      open={open && !!member}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          setTab("overview");
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md"
        showCloseButton
      >
        {member ? (
          <>
            <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
                >
                  {memberInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-base font-semibold tracking-tight">
                    {member.name}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 text-sm text-foreground/55">
                    {[
                      genderDisplay(member.gender) !== "—"
                        ? genderDisplay(member.gender)
                        : null,
                      age != null ? `Age ${age}` : null,
                      member.is_youth ? "Youth" : null,
                      member.wardName,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="flex gap-1 border-b border-border px-4 pt-2">
              {(
                [
                  { id: "overview" as const, label: "Overview" },
                  { id: "sacrament" as const, label: "Sacrament" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "relative px-3 py-2 text-sm font-medium transition-colors",
                    tab === t.id
                      ? "text-foreground"
                      : "text-foreground/45 hover:text-foreground/70",
                  )}
                >
                  {t.label}
                  {tab === t.id ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {tab === "overview" ? (
                <div className="space-y-5">
                  <div className="space-y-4">
                    <Field label="Phone">
                      {member.phone ? (
                        <a
                          href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                          className="text-[var(--accent-primary)] underline-offset-2 hover:underline"
                        >
                          {member.phone}
                        </a>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </Field>
                    <Field label="Email">
                      {member.email ? (
                        <a
                          href={`mailto:${member.email}`}
                          className="break-all text-[var(--accent-primary)] underline-offset-2 hover:underline"
                        >
                          {member.email}
                        </a>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                    </Field>
                  </div>

                  <dl className="rounded-xl border border-border bg-muted/20 px-3">
                    <Row label="Birth date">
                      {birthLabel !== "—" && age != null
                        ? `${birthLabel} (${age})`
                        : birthLabel}
                    </Row>
                    <Row label="Gender">{genderDisplay(member.gender)}</Row>
                    <Row label="Youth">{member.is_youth ? "Yes" : "No"}</Row>
                    <Row label="Unit">{member.wardName}</Row>
                  </dl>
                </div>
              ) : (
                <dl className="rounded-xl border border-border bg-muted/20 px-3">
                  <Row label="Last talk">{member.lastTalkSunday ?? "—"}</Row>
                  <Row label="Talk notes">{member.lastTalkNote?.trim() || "—"}</Row>
                  <Row label="Spoke">{formatDelivered(member.lastTalkDelivered)}</Row>
                  <Row label="Last prayer">{member.lastPrayerSunday ?? "—"}</Row>
                  <Row label="Prayer role">{member.lastPrayerRole}</Row>
                  <Row label="Prayer notes">{member.lastPrayerNote?.trim() || "—"}</Row>
                  <Row label="Prayed">{formatDelivered(member.lastPrayerFulfilled)}</Row>
                </dl>
              )}
            </div>

            {onEdit ? (
              <div className="mt-auto border-t border-border px-5 py-3">
                <button
                  type="button"
                  onClick={() => onEdit(member)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-foreground"
                >
                  Edit member
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
