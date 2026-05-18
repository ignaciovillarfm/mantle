import { describe, expect, it } from "vitest";
import {
  formatGivenNames,
  userDisplayNameFromAuth,
  userInitialsFromDisplayName,
} from "./userDisplayName";

describe("formatGivenNames", () => {
  it("abbreviates middle names to initials", () => {
    expect(formatGivenNames("Juan Carlos")).toBe("Juan C.");
    expect(formatGivenNames("Jane Marie Ann")).toBe("Jane M. A.");
  });
});

describe("userDisplayNameFromAuth", () => {
  it("uses given with middle initial and first surname", () => {
    expect(
      userDisplayNameFromAuth({
        user_metadata: { given_name: "Juan Carlos", family_name: "Pérez Martínez" },
      }),
    ).toBe("Juan C. Pérez");
  });

  it("uses single family_name as surname", () => {
    expect(
      userDisplayNameFromAuth({
        user_metadata: { given_name: "Jane", family_name: "Doe" },
      }),
    ).toBe("Jane Doe");
  });

  it("formats full_name with 4+ parts", () => {
    expect(
      userDisplayNameFromAuth({
        user_metadata: { full_name: "Juan Carlos Pérez Martínez" },
      }),
    ).toBe("Juan C. Pérez");
  });

  it("uses first two parts for 3-part full_name (two surnames, no middle)", () => {
    expect(
      userDisplayNameFromAuth({
        user_metadata: { full_name: "Ignacio Villaramun Smith" },
      }),
    ).toBe("Ignacio Villaramun");
  });

  it("keeps two-word names unchanged", () => {
    expect(
      userDisplayNameFromAuth({
        user_metadata: { full_name: "Jane Doe" },
      }),
    ).toBe("Jane Doe");
  });
});

describe("userInitialsFromDisplayName", () => {
  it("uses first and last initials", () => {
    expect(userInitialsFromDisplayName("Juan C. Pérez")).toBe("JP");
  });
});
