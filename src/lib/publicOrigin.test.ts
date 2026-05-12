import { describe, expect, it, vi } from "vitest";
import { getPublicOrigin, safeInternalPath } from "./publicOrigin";
import type { NextRequest } from "next/server";

function mockRequest(url: string): NextRequest {
  return { nextUrl: new URL(url) } as NextRequest;
}

describe("getPublicOrigin", () => {
  it("uses request origin when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getPublicOrigin(mockRequest("https://app.example/login"))).toBe(
      "https://app.example",
    );
    vi.unstubAllEnvs();
  });

  it("uses request origin when env is whitespace", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  ");
    expect(getPublicOrigin(mockRequest("https://prod.example/"))).toBe(
      "https://prod.example",
    );
    vi.unstubAllEnvs();
  });

  it("prefixes https when env has host only", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "mantle-jade.vercel.app");
    expect(getPublicOrigin(mockRequest("https://other.example/"))).toBe(
      "https://mantle-jade.vercel.app",
    );
    vi.unstubAllEnvs();
  });

  it("uses env origin when valid full URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mantle-jade.vercel.app/");
    expect(getPublicOrigin(mockRequest("http://localhost:3000/"))).toBe(
      "https://mantle-jade.vercel.app",
    );
    vi.unstubAllEnvs();
  });

  it("falls back when env is not a valid URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", ":::");
    expect(getPublicOrigin(mockRequest("https://fallback.example/x"))).toBe(
      "https://fallback.example",
    );
    vi.unstubAllEnvs();
  });
});

describe("safeInternalPath", () => {
  it("allows root-relative paths", () => {
    expect(safeInternalPath("/sacrament")).toBe("/sacrament");
  });

  it("rejects protocol-relative and non-path", () => {
    expect(safeInternalPath("//evil.com")).toBe("/dashboard");
    expect(safeInternalPath("https://x")).toBe("/dashboard");
    expect(safeInternalPath(null)).toBe("/dashboard");
  });
});
