"use client";

import { AppearanceSettings } from "./AppearanceSettings";
import { ProgramTextSettings } from "./ProgramTextSettings";
import { WardInvitesPanel } from "./WardInvitesPanel";
import type { ProgramTemplatesMap } from "@/lib/sacrament/loadProgramTemplates";
import { cn } from "@/lib/utils";
import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type WardRoleRow = {
  wardId: string;
  wardName: string;
  role: string;
  roleLabel: string;
};

type LeadershipWard = {
  wardId: string;
  wardName: string;
  role: string;
};

type SettingsSectionId =
  | "profile"
  | "appearance"
  | "access"
  | "invites"
  | "program-text";

type NavItem = {
  id: SettingsSectionId;
  label: string;
  group: "account" | "ward";
};

function parseSection(
  value: string | null,
  allowed: SettingsSectionId[],
): SettingsSectionId {
  if (value && allowed.includes(value as SettingsSectionId)) {
    return value as SettingsSectionId;
  }
  return "profile";
}

export function SettingsClient({
  displayName,
  email,
  oauthEmail,
  avatarUrl,
  wardRoles,
  leadershipWards,
  siteOrigin,
  isBishop,
  programTemplatesInitial,
}: {
  displayName: string;
  email: string;
  oauthEmail: string;
  avatarUrl: string | null;
  wardRoles: WardRoleRow[];
  leadershipWards: LeadershipWard[];
  siteOrigin: string;
  isBishop: boolean;
  programTemplatesInitial: {
    wardId: string;
    defaults: ProgramTemplatesMap;
    templates: ProgramTemplatesMap;
  } | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [inviteWardId, setInviteWardId] = useState(leadershipWards[0]?.wardId ?? "");

  const navItems = useMemo(() => {
    const items: NavItem[] = [
      { id: "profile", label: "Profile", group: "account" },
      { id: "appearance", label: "Appearance", group: "account" },
      { id: "access", label: "Ward access & roles", group: "account" },
    ];
    if (leadershipWards.length > 0) {
      items.push({ id: "invites", label: "Invites", group: "account" });
      items.push({ id: "program-text", label: "Program text", group: "ward" });
    }
    return items;
  }, [leadershipWards.length]);

  const allowedIds = useMemo(() => navItems.map((i) => i.id), [navItems]);
  const [activeId, setActiveId] = useState<SettingsSectionId>(() =>
    parseSection(searchParams.get("section"), allowedIds),
  );

  const activeLabel = navItems.find((i) => i.id === activeId)?.label ?? "Profile";

  const setSection = (id: SettingsSectionId) => {
    setActiveId(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id === "profile") params.delete("section");
    else params.set("section", id);
    const qs = params.toString();
    // Shallow URL update — avoids App Router RSC refetch on every tab click.
    window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
  };

  const accountItems = navItems.filter((i) => i.group === "account");
  const wardItems = navItems.filter((i) => i.group === "ward");

  return (
    <div className="w-full pb-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <aside className="h-fit w-full shrink-0 self-start lg:sticky lg:top-6 lg:w-56">
          <nav
            aria-label="Settings"
            className="h-fit rounded-2xl border border-border bg-surface p-4 shadow-sm"
          >
            <h1 className="px-2 text-lg font-semibold tracking-tight text-foreground">Settings</h1>

            <div className="mt-5 space-y-5">
              <NavGroup
                label="Account"
                items={accountItems}
                activeId={activeId}
                onSelect={setSection}
              />
              {wardItems.length > 0 ? (
                <NavGroup
                  label="Ward"
                  items={wardItems}
                  activeId={activeId}
                  onSelect={setSection}
                />
              ) : null}
            </div>
          </nav>
        </aside>

        {/* pt-4 matches sidebar card padding so titles share the same top edge */}
        <main className="min-w-0 flex-1 pt-4">
          <h2 className="px-2 text-lg font-semibold tracking-tight text-foreground">
            {activeLabel}
          </h2>

          <div className="mt-4">
            <div className={cn(activeId !== "profile" && "hidden")}>
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-border"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold ring-1 ring-border">
                      {userInitialsFromDisplayName(displayName)}
                    </span>
                  )}
                  <dl className="min-w-0 flex-1 space-y-2 text-sm">
                    <div>
                      <dt className="text-foreground/50">Name</dt>
                      <dd className="font-medium text-foreground">{displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-foreground/50">Sign-in email</dt>
                      <dd className="break-all font-medium text-foreground">
                        {oauthEmail || email}
                      </dd>
                    </div>
                    {email && email !== oauthEmail ? (
                      <div>
                        <dt className="text-foreground/50">Ward app profile email</dt>
                        <dd className="break-all text-foreground">{email}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>

                {isBishop ? (
                  <p className="mt-5 border-t border-border pt-4 text-sm text-foreground/50">
                    <Link
                      href="/admin"
                      className="text-foreground/70 underline hover:text-foreground"
                    >
                      Admin tools
                    </Link>{" "}
                    (bishop only)
                  </p>
                ) : null}

                <form action="/auth/sign-out" method="post" className="mt-5">
                  <button
                    type="submit"
                    className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-surface-hover"
                  >
                    Sign out
                  </button>
                </form>
              </section>
            </div>

            <div className={cn(activeId !== "appearance" && "hidden")}>
              <AppearanceSettings />
            </div>

            <div className={cn(activeId !== "access" && "hidden")}>
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm text-foreground/60">
                  Roles determine what you can view and edit in each ward.
                </p>
                {wardRoles.length === 0 ? (
                  <p className="mt-4 text-sm text-foreground/70">
                    You are not assigned to a ward yet. Ask a bishopric member to send you an
                    invite.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
                    {wardRoles.map((r) => (
                      <li
                        key={`${r.wardId}-${r.role}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                      >
                        <span className="font-medium text-foreground">{r.wardName}</span>
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                          {r.roleLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {leadershipWards.length > 0 ? (
              <div className={cn(activeId !== "invites" && "hidden")}>
                <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <p className="text-sm text-foreground/60">
                    Creates a pending invite, then copy the sign-in link below and send it (text,
                    WhatsApp, etc.). Automatic email works after you verify a domain in Resend.
                    They must sign in with Google using the exact email you enter.
                  </p>
                  {leadershipWards.length > 1 ? (
                    <label className="mt-4 block text-sm">
                      <span className="mb-1 block font-medium text-foreground">Ward</span>
                      <select
                        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                        value={inviteWardId}
                        onChange={(e) => setInviteWardId(e.target.value)}
                      >
                        {leadershipWards.map((w) => (
                          <option key={w.wardId} value={w.wardId}>
                            {w.wardName}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {inviteWardId ? (
                    <WardInvitesPanel
                      wardId={inviteWardId}
                      wardName={
                        leadershipWards.find((w) => w.wardId === inviteWardId)?.wardName ??
                        "Ward"
                      }
                      siteOrigin={siteOrigin}
                    />
                  ) : null}
                </section>
              </div>
            ) : null}

            {leadershipWards.length > 0 ? (
              <div className={cn(activeId !== "program-text" && "hidden")}>
                <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <ProgramTextSettings
                    wards={leadershipWards.map((w) => ({
                      wardId: w.wardId,
                      wardName: w.wardName,
                    }))}
                    initialWardId={
                      programTemplatesInitial?.wardId ?? leadershipWards[0]?.wardId ?? ""
                    }
                    initialTemplates={programTemplatesInitial?.templates}
                    initialDefaults={programTemplatesInitial?.defaults}
                  />
                </section>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: NavItem[];
  activeId: SettingsSectionId;
  onSelect: (id: SettingsSectionId) => void;
}) {
  return (
    <div>
      <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-foreground/45">
        {label}
      </p>
      <ul className="mt-1.5 space-y-0.5">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "w-full rounded-lg px-2.5 py-2 text-left text-sm transition",
                  active
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-foreground/75 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
