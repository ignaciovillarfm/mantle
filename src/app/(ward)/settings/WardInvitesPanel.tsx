"use client";

import { InviteShareBox } from "./InviteShareBox";
import { useOnline } from "@/hooks/useOnline";
import { shareableLoginUrl } from "@/lib/shareableLoginUrl";
import { WARD_INVITE_ROLES, wardRoleLabel } from "@/lib/wardInvites";
import { useCallback, useEffect, useState } from "react";

type InviteRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
};

type LastInvite = {
  email: string;
  role: string;
  emailSent: boolean;
};

const INPUT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground";
const SELECT_CLASS =
  "mt-1 h-10 w-full rounded-lg border border-border bg-background py-0 pl-3 pr-10 text-sm leading-10 text-foreground";

export function WardInvitesPanel({
  wardId,
  wardName,
  siteOrigin,
}: {
  wardId: string;
  wardName: string;
  siteOrigin: string;
}) {
  const online = useOnline();
  const loginUrl = shareableLoginUrl(siteOrigin);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof WARD_INVITE_ROLES)[number]>("clerk");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<LastInvite | null>(null);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/ward-invites?ward_id=${encodeURIComponent(wardId)}`,
        { credentials: "same-origin" },
      );
      const j = (await res.json()) as { error?: string; invites?: InviteRow[] };
      if (!res.ok) throw new Error(j.error ?? "Failed to load invites");
      setInvites(j.invites ?? []);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, [wardId]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLastInvite(null);
    setBusy(true);
    try {
      const res = await fetch("/api/ward-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ward_id: wardId, email, role }),
      });
      const j = (await res.json()) as {
        error?: string;
        emailSent?: boolean;
        emailError?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "Invite failed");
      const inviteEmail = email.trim().toLowerCase();
      setEmail("");
      setLastInvite({
        email: inviteEmail,
        role,
        emailSent: j.emailSent === true,
      });
      if (j.emailSent) {
        setMsg(null);
      } else if (j.emailError) {
        setMsg(
          j.emailError.includes("testing emails")
            ? "Automatic email is limited until you verify a domain in Resend. Copy the link below and send it manually."
            : j.emailError,
        );
      }
      await loadInvites();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    setMsg(null);
    try {
      const res = await fetch("/api/ward-invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ invite_id: id }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Revoke failed");
      await loadInvites();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Revoke failed");
    }
  }

  const pending = invites.filter((i) => i.status === "pending");

  return (
    <div className="mt-5 space-y-5">
      <InviteShareBox siteOrigin={siteOrigin} wardName={wardName} />

      {!online ? (
        <p className="text-sm text-warning">Offline — invites are disabled until you reconnect.</p>
      ) : null}

      <form
        onSubmit={(e) => void createInvite(e)}
        className="space-y-3 rounded-lg border border-dashed border-border p-4"
        suppressHydrationWarning
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
      >
        <p className="text-sm font-medium text-foreground">New invite — {wardName}</p>
        <label className="block text-sm" suppressHydrationWarning>
          <span className="mb-1 block text-foreground/70">Email</span>
          <input
            type="email"
            required
            name="ward-invite-email"
            autoComplete="off"
            className={INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            disabled={!online || busy}
            suppressHydrationWarning
            data-1p-ignore
            data-lpignore="true"
          />
        </label>
        <label className="block text-sm" suppressHydrationWarning>
          <span className="mb-1 block text-foreground/70">Role</span>
          <select
            name="ward-invite-role"
            className={SELECT_CLASS}
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof WARD_INVITE_ROLES)[number])}
            disabled={!online || busy}
            suppressHydrationWarning
            autoComplete="off"
          >
            {WARD_INVITE_ROLES.map((r) => (
              <option key={r} value={r}>
                {wardRoleLabel(r, "en")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!online || busy || !email.trim()}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
          suppressHydrationWarning
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </form>

      {lastInvite ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {lastInvite.emailSent
              ? `Invite created and email sent to ${lastInvite.email}.`
              : `Invite created for ${lastInvite.email}. Copy the link or message below and send it to them.`}
          </p>
          <InviteShareBox
            siteOrigin={siteOrigin}
            wardName={wardName}
            inviteeEmail={lastInvite.email}
            roleLabel={wardRoleLabel(lastInvite.role, "en")}
            compact
          />
        </div>
      ) : null}

      {msg ? <p className="text-sm text-foreground/70">{msg}</p> : null}

      <div>
        <h3 className="text-sm font-semibold text-foreground">Pending & recent invites</h3>
        {loading ? (
          <p className="mt-2 text-sm text-foreground/50">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/50">No invites yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
            {invites.map((inv) => (
              <li key={inv.id} className="px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{inv.email}</p>
                    <p className="text-xs text-foreground/55">
                      {wardRoleLabel(inv.role, "en")} · {inv.status}
                      {inv.status === "pending"
                        ? ` · expires ${new Date(inv.expires_at).toLocaleDateString("en-US")}`
                        : ""}
                    </p>
                  </div>
                  {inv.status === "pending" ? (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-foreground/60 underline hover:text-foreground"
                      onClick={() => void revokeInvite(inv.id)}
                      disabled={!online}
                    >
                      Revoke
                    </button>
                  ) : null}
                </div>
                {inv.status === "pending" ? (
                  <p className="mt-1.5 text-xs text-foreground/55">
                    Share:{" "}
                    <a href={loginUrl} className="underline break-all">
                      {loginUrl}
                    </a>
                    {" · "}
                    Google as {inv.email}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
