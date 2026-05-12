import { describe, expect, it } from "vitest";
import { getNextCallingStatus } from "./callingStatus";

describe("getNextCallingStatus", () => {
  it("matches edge workflow order", () => {
    expect(getNextCallingStatus("Proposed")).toBe("Extended");
    expect(getNextCallingStatus("Set Apart")).toBe(null);
  });
});
