import { describe, expect, it } from "vitest";
import { assertAllowedTransition, nextCallingStatus } from "./callingTransitions.ts";

describe("callingTransitions", () => {
  it("nextCallingStatus returns one step or null at end", () => {
    expect(nextCallingStatus("Proposed")).toBe("Extended");
    expect(nextCallingStatus("Set Apart")).toBe(null);
  });

  it("walks forward one step", () => {
    expect(assertAllowedTransition("Proposed", "Extended")).toBe("Extended");
    expect(assertAllowedTransition("Extended", "Accepted")).toBe("Accepted");
  });

  it("rejects skips", () => {
    expect(() => assertAllowedTransition("Proposed", "Accepted")).toThrow();
  });

  it("rejects invalid target", () => {
    expect(() => assertAllowedTransition("Proposed", "Done")).toThrow();
  });
});
