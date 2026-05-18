import { describe, expect, it } from "vitest";
import { normalizeInviteEmail, wardRoleLabel } from "./wardInvites";

describe("normalizeInviteEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeInviteEmail("  User@Example.COM ")).toBe("user@example.com");
  });
});

describe("wardRoleLabel", () => {
  it("returns English labels", () => {
    expect(wardRoleLabel("bishop", "en")).toBe("Bishop");
    expect(wardRoleLabel("clerk", "es")).toBe("Secretario");
  });
});
