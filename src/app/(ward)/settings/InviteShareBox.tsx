"use client";

import { buildManualInviteMessage, shareableLoginUrl } from "@/lib/shareableLoginUrl";
import { useCallback, useState } from "react";

function CopyButton({
  label,
  onCopy,
}: {
  label: string;
  onCopy: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    try {
      await onCopy();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [onCopy]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-hover"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export function InviteShareBox({
  siteOrigin,
  wardName,
  inviteeEmail,
  roleLabel,
  compact,
}: {
  siteOrigin: string;
  wardName: string;
  inviteeEmail?: string;
  roleLabel?: string;
  compact?: boolean;
}) {
  const loginUrl = shareableLoginUrl(siteOrigin);
  const message =
    inviteeEmail && roleLabel
      ? buildManualInviteMessage({
          wardName,
          loginUrl,
          inviteeEmail,
          role: roleLabel,
        })
      : null;

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div
      className={`rounded-lg border border-border bg-background/60 ${compact ? "p-3" : "p-4"} space-y-3`}
    >
      {!compact ? (
        <p className="text-sm text-foreground/75">
          Share this link until email is set up with your own domain. They must sign in with
          Google using the <strong>exact email</strong> on the invite.
        </p>
      ) : null}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          Sign-in link
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <a
            href={loginUrl}
            className="min-w-0 flex-1 break-all text-sm font-medium text-foreground underline"
          >
            {loginUrl}
          </a>
          <CopyButton label="Copy link" onCopy={() => copyText(loginUrl)} />
        </div>
      </div>
      {message ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
            Message to send (text, WhatsApp, etc.)
          </p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground/85">
            {message}
          </pre>
          <div className="mt-2">
            <CopyButton label="Copy message" onCopy={() => copyText(message)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
