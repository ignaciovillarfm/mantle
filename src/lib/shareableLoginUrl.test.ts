import { describe, expect, it } from "vitest";
import { buildManualInviteMessage, shareableLoginUrl } from "./shareableLoginUrl";

describe("shareableLoginUrl", () => {
  it("uses site origin when provided", () => {
    expect(shareableLoginUrl("https://mantle-jade.vercel.app")).toBe(
      "https://mantle-jade.vercel.app/login",
    );
  });

  it("falls back to production default when origin empty", () => {
    expect(shareableLoginUrl("")).toBe("https://mantle-jade.vercel.app/login");
  });
});

describe("buildManualInviteMessage", () => {
  it("includes ward, link, and email", () => {
    const text = buildManualInviteMessage({
      wardName: "West Park",
      loginUrl: "https://mantle-jade.vercel.app/login",
      inviteeEmail: "a@b.com",
      role: "Clerk",
    });
    expect(text).toContain("West Park");
    expect(text).toContain("https://mantle-jade.vercel.app/login");
    expect(text).toContain("a@b.com");
  });
});
