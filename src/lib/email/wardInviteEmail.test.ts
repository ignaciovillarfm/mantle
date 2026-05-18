import { describe, expect, it, vi } from "vitest";
import { buildWardInviteEmail, formatResendFrom } from "./wardInviteEmail";

describe("formatResendFrom", () => {
  it("builds Mantle + ward name + email from RESEND_FROM_EMAIL", () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "onboarding@resend.dev");
    vi.stubEnv("RESEND_FROM", "");
    expect(formatResendFrom("West Park")).toBe('"Mantle West Park" <onboarding@resend.dev>');
    vi.unstubAllEnvs();
  });

  it("parses email from legacy RESEND_FROM", () => {
    vi.stubEnv("RESEND_FROM_EMAIL", "");
    vi.stubEnv("RESEND_FROM", "Mantle Ward <onboarding@resend.dev>");
    expect(formatResendFrom("Riverside")).toBe('"Mantle Riverside" <onboarding@resend.dev>');
    vi.unstubAllEnvs();
  });
});

describe("buildWardInviteEmail", () => {
  it("includes ward, role, and login link", () => {
    const { subject, text, html } = buildWardInviteEmail({
      wardName: "West Park",
      role: "clerk",
      loginUrl: "https://mantle-jade.vercel.app/login",
      expiresAt: "2026-06-01T00:00:00.000Z",
    });
    expect(subject).toContain("West Park");
    expect(text).toContain("Clerk");
    expect(text).toContain("https://mantle-jade.vercel.app/login");
    expect(html).toContain("Sign in with Google");
  });
});
