import { describe, expect, it } from "vitest";
import {
  countWardBusinessSectionPrintRows,
  shouldMoveWardBusinessToPrintBack,
  type WardBusinessSection,
} from "./sacramentProgram";

function releaseSection(entries: { memberId: string; callingPositionId: string }[]): WardBusinessSection {
  return {
    id: "r1",
    kind: "releases",
    title: "",
    body: "",
    releaseEntries: entries,
  };
}

describe("shouldMoveWardBusinessToPrintBack", () => {
  it("returns false with no ward business sections", () => {
    expect(shouldMoveWardBusinessToPrintBack([])).toBe(false);
    expect(shouldMoveWardBusinessToPrintBack(undefined)).toBe(false);
  });

  it("returns true with two or more sections", () => {
    const sections: WardBusinessSection[] = [
      { id: "a", kind: "other", title: "", body: "Short" },
      { id: "b", kind: "other", title: "", body: "Also short" },
    ];
    expect(shouldMoveWardBusinessToPrintBack(sections)).toBe(true);
  });

  it("returns true with one section and three or more rows", () => {
    const sections = [
      releaseSection([
        { memberId: "m1", callingPositionId: "c1" },
        { memberId: "m2", callingPositionId: "c2" },
        { memberId: "m3", callingPositionId: "c3" },
      ]),
    ];
    expect(countWardBusinessSectionPrintRows(sections[0])).toBe(3);
    expect(shouldMoveWardBusinessToPrintBack(sections)).toBe(true);
  });

  it("returns false with one section and fewer than three rows", () => {
    const sections = [
      releaseSection([
        { memberId: "m1", callingPositionId: "c1" },
        { memberId: "m2", callingPositionId: "c2" },
      ]),
    ];
    expect(shouldMoveWardBusinessToPrintBack(sections)).toBe(false);
  });
});
