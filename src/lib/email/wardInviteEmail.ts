import { wardRoleLabel } from "@/lib/wardInvites";

export type WardInviteEmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildWardInviteEmail(input: {
  wardName: string;
  role: string;
  loginUrl: string;
  expiresAt: string;
}): WardInviteEmailContent {
  const roleLabel = wardRoleLabel(input.role, "en");
  const expires = new Date(input.expiresAt).toLocaleDateString("en-US", {
    dateStyle: "long",
  });
  const wardName = input.wardName.trim() || "your ward";
  const loginUrl = input.loginUrl.trim();

  const subject = `You're invited to Mantle — ${wardName}`;

  const text = [
    `You've been invited to join ${wardName} on Mantle Ward as ${roleLabel}.`,
    "",
    "Sign in with Google using this email address:",
    loginUrl,
    "",
    `This invite expires on ${expires}.`,
    "",
    "If you weren't expecting this, you can ignore this email.",
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#1a1a1a;max-width:32rem;margin:0 auto;padding:1.5rem;">
  <p>You've been invited to join <strong>${escapeHtml(wardName)}</strong> on <strong>Mantle Ward</strong> as <strong>${escapeHtml(roleLabel)}</strong>.</p>
  <p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:0.65rem 1.25rem;border-radius:0.5rem;font-weight:600;">Sign in with Google</a></p>
  <p style="font-size:0.875rem;color:#555;">Or open this link: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></p>
  <p style="font-size:0.875rem;color:#555;">Use the same Google account as this email. Invite expires ${escapeHtml(expires)}.</p>
  <p style="font-size:0.75rem;color:#888;">If you weren't expecting this, you can ignore this email.</p>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resend sender address, e.g. `"Mantle West Park" <onboarding@resend.dev>`. */
export function formatResendFrom(wardName: string): string | null {
  const email = resolveResendFromEmail();
  if (!email) return null;
  const prefix = process.env.RESEND_FROM_PREFIX?.trim() || "Mantle";
  const ward = wardName.trim() || "Ward";
  const display = `${prefix} ${ward}`;
  return `"${display.replace(/"/g, '\\"')}" <${email}>`;
}

function resolveResendFromEmail(): string | null {
  const direct = process.env.RESEND_FROM_EMAIL?.trim();
  if (direct) return direct.replace(/^<|>$/g, "");

  const legacy = process.env.RESEND_FROM?.trim();
  if (!legacy) return null;
  const bracketed = legacy.match(/<([^>]+)>/);
  if (bracketed) return bracketed[1].trim();
  if (legacy.includes("@")) return legacy;
  return null;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && resolveResendFromEmail());
}

export type SendWardInviteEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed"; detail?: string };

export async function sendWardInviteEmail(input: {
  to: string;
  wardName: string;
  role: string;
  loginUrl: string;
  expiresAt: string;
}): Promise<SendWardInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = formatResendFrom(input.wardName);
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const { subject, text, html } = buildWardInviteEmail(input);

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject,
    text,
    html,
  });

  if (error) {
    return {
      sent: false,
      reason: "send_failed",
      detail: error.message,
    };
  }

  return { sent: true };
}
