"use client";

import { AppearanceSettings } from "./AppearanceSettings";
import { WardInvitesPanel } from "./WardInvitesPanel";
import { userInitialsFromDisplayName } from "@/lib/userDisplayName";
import Link from "next/link";
import { useState } from "react";

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

export function SettingsClient({
  displayName,
  email,
  oauthEmail,
  avatarUrl,
  wardRoles,
  leadershipWards,
  siteOrigin,
  isBishop,
}: {
  displayName: string;
  email: string;
  oauthEmail: string;
  avatarUrl: string | null;
  wardRoles: WardRoleRow[];
  leadershipWards: LeadershipWard[];
  siteOrigin: string;
  isBishop: boolean;
}) {
  const [inviteWardId, setInviteWardId] = useState(leadershipWards[0]?.wardId ?? "");

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="mt-1 text-sm text-foreground/60">
          Your profile, ward access, and team invitations.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="mt-4 flex items-start gap-4">
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
              <dd className="break-all font-medium text-foreground">{oauthEmail || email}</dd>
            </div>
            {email && email !== oauthEmail ? (
              <div>
                <dt className="text-foreground/50">Ward app profile email</dt>
                <dd className="break-all text-foreground">{email}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <AppearanceSettings />

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Ward access & roles</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Roles determine what you can view and edit in each ward.
        </p>
        {wardRoles.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/70">
            You are not assigned to a ward yet. Ask a bishopric member to send you an invite.
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

      {leadershipWards.length > 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Invite ward participants</h2>
          <p className="mt-1 text-sm text-foreground/60">
            Creates a pending invite, then copy the sign-in link below and send it (text,
            WhatsApp, etc.). Automatic email works after you verify a domain in Resend. They
            must sign in with Google using the exact email you enter.
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
                leadershipWards.find((w) => w.wardId === inviteWardId)?.wardName ?? "Ward"
              }
              siteOrigin={siteOrigin}
            />
          ) : null}
        </section>
      ) : null}

      {isBishop ? (
        <p className="text-sm text-foreground/50">
          <Link href="/admin" className="text-foreground/70 underline hover:text-foreground">
            Admin tools
          </Link>{" "}
          (bishop only)
        </p>
      ) : null}

      <form action="/auth/sign-out" method="post">
        <button
          type="submit"
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground/80 hover:bg-surface-hover"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
