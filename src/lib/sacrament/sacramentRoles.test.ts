import { describe, expect, it } from "vitest";
import {
  firstPoolMember,
  mergeRoleMemberIds,
  normalizeRolePool,
  reorderListItems,
  roleMemberOptions,
  serializeRolePool,
} from "./sacramentRoles";

describe("sacramentRoles", () => {
  it("serializeRolePool dedupes and is stable", () => {
    const pool = normalizeRolePool({
      presiding: ["a", "a", "b"],
      conducting: [],
      chorister: ["c"],
      organist: [],
    });
    expect(serializeRolePool(pool)).toBe(serializeRolePool(pool));
    expect(JSON.parse(serializeRolePool(pool))).toEqual(pool);
  });

  it("reorderListItems moves an item without duplicating", () => {
    expect(reorderListItems(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorderListItems(["a", "b", "c"], 0, 0)).toEqual(["a", "b", "c"]);
  });

  it("mergeRoleMemberIds dedupes pool before suggestions", () => {
    expect(mergeRoleMemberIds(["a", "b"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("roleMemberOptions lists only configured pool members", () => {
    const members = [
      { id: "z", name: "Zoe" },
      { id: "a", name: "Ann" },
      { id: "b", name: "Bob" },
    ];
    const options = roleMemberOptions(["b", "a"], null, members);
    expect(options.map((m) => m.id)).toEqual(["b", "a"]);
  });

  it("roleMemberOptions lists current selection first then pool", () => {
    const members = [
      { id: "a", name: "Ann" },
      { id: "x", name: "Xavier" },
    ];
    const options = roleMemberOptions(["a"], "x", members);
    expect(options.map((m) => m.id)).toEqual(["x", "a"]);
  });

  it("firstPoolMember returns first pool id", () => {
    expect(firstPoolMember(["p1", "p2"])).toBe("p1");
    expect(firstPoolMember([])).toBeNull();
  });
});
