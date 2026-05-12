import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./normalizeUrl";

describe("normalizeSupabaseUrl", () => {
  it("strips /rest/v1 from hosted project URL", () => {
    expect(
      normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1/"),
    ).toBe("https://abcd.supabase.co");
  });

  it("uses origin only for supabase.co hosts with extra path", () => {
    expect(
      normalizeSupabaseUrl("https://abcd.supabase.co/rest/v1/auth/v1/callback"),
    ).toBe("https://abcd.supabase.co");
  });
});
