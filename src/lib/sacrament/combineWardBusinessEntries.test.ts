import { describe, expect, it } from "vitest";
import { combineWardBusinessEntries } from "./combineWardBusinessEntries";

describe("combineWardBusinessEntries", () => {
  const members = new Map([
    ["m1", "Ana García"],
    ["m2", "Juan Pérez"],
    ["m3", "María López"],
  ]);
  const callings = new Map([
    ["c1", "Primary Teacher"],
    ["c2", "Relief Society President"],
  ]);

  it("keeps people with the same calling as separate lines when not linked", () => {
    const lines = combineWardBusinessEntries(
      [
        { memberId: "m1", callingPositionId: "c1" },
        { memberId: "m2", callingPositionId: "c1" },
      ],
      members,
      callings,
      "es",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ names: "Ana García", calling: "Primary Teacher" });
    expect(lines[1]).toMatchObject({ names: "Juan Pérez", calling: "Primary Teacher" });
  });

  it("combines only people who share an explicit linkGroupId", () => {
    const lines = combineWardBusinessEntries(
      [
        { memberId: "m1", callingPositionId: "c1", linkGroupId: "g1" },
        { memberId: "m2", callingPositionId: "c1", linkGroupId: "g1" },
        { memberId: "m3", callingPositionId: "c1" },
      ],
      members,
      callings,
      "es",
    );
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      names: "Ana García y Juan Pérez",
      calling: "Primary Teacher",
      linkGroupId: "g1",
    });
    expect(lines[1]).toMatchObject({
      names: "María López",
      calling: "Primary Teacher",
    });
  });

  it("leaves calling blank when not in the catalog", () => {
    const lines = combineWardBusinessEntries(
      [{ memberId: "m1", callingPositionId: "missing" }],
      members,
      callings,
      "en",
    );
    expect(lines).toEqual([
      expect.objectContaining({ names: "Ana García", calling: "" }),
    ]);
  });
});
