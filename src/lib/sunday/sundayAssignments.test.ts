import { describe, expect, it } from "vitest";
import { assignmentDisplayName, sundayWindow } from "./sundayAssignments";

describe("sundayWindow", () => {
  it("returns only Sundays", () => {
    const sundays = sundayWindow(new Date(2026, 7, 12));
    for (const iso of sundays) {
      const [y, m, d] = iso.split("-").map(Number);
      expect(new Date(y, m - 1, d).getDay()).toBe(0);
    }
  });

  it("spans the requested weeks back and ahead", () => {
    const sundays = sundayWindow(new Date(2026, 7, 12), 2, 12);
    expect(sundays).toHaveLength(15);
    expect(sundays[0]).toBe("2026-08-02");
    expect(sundays.at(-1)).toBe("2026-11-08");
  });

  it("keeps a Sunday reference date inside the window", () => {
    const sundays = sundayWindow(new Date(2026, 7, 9), 1, 1);
    expect(sundays).toEqual(["2026-08-02", "2026-08-09", "2026-08-16"]);
  });

  it("is sorted and free of duplicates", () => {
    const sundays = sundayWindow(new Date(2026, 1, 3));
    expect([...sundays].sort()).toEqual(sundays);
    expect(new Set(sundays).size).toBe(sundays.length);
  });
});

describe("assignmentDisplayName", () => {
  const names = new Map([["m1", "Jane Rivera"]]);

  it("prefers the linked member name", () => {
    expect(assignmentDisplayName("m1", "Familia Rivera", names)).toBe("Jane Rivera");
  });

  it("falls back to free text when the member is unknown", () => {
    expect(assignmentDisplayName("missing", "Familia Rivera", names)).toBe("Familia Rivera");
    expect(assignmentDisplayName(null, "Familia Rivera", names)).toBe("Familia Rivera");
  });

  it("returns an empty string when nothing is assigned", () => {
    expect(assignmentDisplayName(null, null, names)).toBe("");
    expect(assignmentDisplayName(null, "   ", names)).toBe("");
  });
});
