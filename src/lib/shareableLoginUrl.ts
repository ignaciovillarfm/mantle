/** Production app URL used when sharing invites (override via SITE_URL). */
export const DEFAULT_SHAREABLE_ORIGIN = "https://mantle-jade.vercel.app";

export function shareableLoginUrl(siteOrigin: string): string {
  const base =
    siteOrigin.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_DEFAULT_APP_ORIGIN?.trim().replace(/\/$/, "") ||
    DEFAULT_SHAREABLE_ORIGIN;
  return `${base}/login`;
}

export function buildManualInviteMessage(input: {
  wardName: string;
  loginUrl: string;
  inviteeEmail: string;
  role: string;
}): string {
  const email = input.inviteeEmail.trim().toLowerCase();
  return [
    `You've been invited to ${input.wardName} on Mantle Ward (${input.role}).`,
    "",
    `Sign in here: ${input.loginUrl}`,
    "",
    `Use Google with this email address: ${email}`,
  ].join("\n");
}
