import { describe, expect, it } from "vitest";
import { filterMembersByQuery, memberMatchesQuery, normalizeMemberSearch } from "./memberSearch";

describe("memberSearch", () => {
  const members = [
    { id: "1", name: "Ana García" },
    { id: "2", name: "John Smith" },
  ];

  it("normalizes search text", () => {
    expect(normalizeMemberSearch("  María  ")).toBe("maría");
  });

  it("filters members by query", () => {
    expect(filterMembersByQuery(members, "gar")).toEqual([{ id: "1", name: "Ana García" }]);
    expect(filterMembersByQuery(members, "")).toEqual(members);
  });

  it("matches names case-insensitively", () => {
    expect(memberMatchesQuery("John Smith", "smith")).toBe(true);
    expect(memberMatchesQuery("John Smith", "xyz")).toBe(false);
  });
});
