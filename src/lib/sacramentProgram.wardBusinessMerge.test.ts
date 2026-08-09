import { describe, expect, it } from "vitest";
import {
  countWardBusinessSectionPrintRows,
  mergeDuplicateWardBusinessSections,
  newMembersSectionEntries,
  otherSectionEntries,
  parseSacramentProgram,
  type WardBusinessSection,
} from "./sacramentProgram";

function section(overrides: Partial<WardBusinessSection> & { kind: WardBusinessSection["kind"] }) {
  return { id: `s-${Math.random()}`, title: "", body: "", ...overrides } as WardBusinessSection;
}

describe("newMembersSectionEntries", () => {
  it("prefers the entries array", () => {
    expect(
      newMembersSectionEntries(
        section({
          kind: "new_members",
          newMembersEntries: [
            { familyName: "Hernández", familyMembers: "Pablo, Marysol y Sofía" },
            { familyName: "Gonzales", familyMembers: "Soraya" },
          ],
        }),
      ),
    ).toEqual([
      { familyName: "Hernández", familyMembers: "Pablo, Marysol y Sofía" },
      { familyName: "Gonzales", familyMembers: "Soraya" },
    ]);
  });

  it("migrates legacy single-family storage", () => {
    expect(
      newMembersSectionEntries(
        section({ kind: "new_members", newMembersNames: "Hernández, Pablo y Sofía" }),
      ),
    ).toEqual([{ familyName: "Hernández", familyMembers: "Pablo y Sofía" }]);
  });

  it("returns nothing when the section is empty", () => {
    expect(newMembersSectionEntries(section({ kind: "new_members" }))).toEqual([]);
  });
});

describe("otherSectionEntries", () => {
  it("keeps a legacy multi-line body as a single item", () => {
    expect(
      otherSectionEntries(section({ kind: "other", body: "Bendición de bebé\nde la familia Webster" })),
    ).toEqual(["Bendición de bebé\nde la familia Webster"]);
  });

  it("prefers the entries array", () => {
    expect(
      otherSectionEntries(
        section({ kind: "other", body: "legacy", otherEntries: ["Webster", "Rivera"] }),
      ),
    ).toEqual(["Webster", "Rivera"]);
  });
});

describe("mergeDuplicateWardBusinessSections", () => {
  it("folds repeated new_members sections into one", () => {
    const merged = mergeDuplicateWardBusinessSections([
      section({ kind: "new_members", newMembersNames: "Hernández, Pablo, Marysol y Sofía" }),
      section({ kind: "new_members", newMembersNames: "Gonzales, Soraya" }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].newMembersEntries).toEqual([
      { familyName: "Hernández", familyMembers: "Pablo, Marysol y Sofía" },
      { familyName: "Gonzales", familyMembers: "Soraya" },
    ]);
  });

  it("folds repeated other sections into one", () => {
    const merged = mergeDuplicateWardBusinessSections([
      section({ kind: "other", body: "Bendición de bebé de la familia Webster" }),
      section({ kind: "other", body: "Bendición de bebé de la familia Rivera" }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].otherEntries).toEqual([
      "Bendición de bebé de la familia Webster",
      "Bendición de bebé de la familia Rivera",
    ]);
  });

  it("merges person entries and drops duplicates", () => {
    const merged = mergeDuplicateWardBusinessSections([
      section({
        kind: "sustainings",
        sustainingEntries: [{ memberId: "m1", callingPositionId: "c1" }],
      }),
      section({
        kind: "sustainings",
        sustainingEntries: [
          { memberId: "m1", callingPositionId: "c1" },
          { memberId: "m2", callingPositionId: "c2" },
        ],
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].sustainingEntries).toEqual([
      { memberId: "m1", callingPositionId: "c1" },
      { memberId: "m2", callingPositionId: "c2" },
    ]);
  });

  it("keeps distinct kinds separate and preserves their first-seen order", () => {
    const merged = mergeDuplicateWardBusinessSections([
      section({ kind: "other", body: "Webster" }),
      section({ kind: "new_members", newMembersNames: "Gonzales, Soraya" }),
      section({ kind: "other", body: "Rivera" }),
    ]);

    expect(merged.map((s) => s.kind)).toEqual(["other", "new_members"]);
  });
});

describe("parseSacramentProgram", () => {
  it("consolidates duplicated sections coming from stored programs", () => {
    const parsed = parseSacramentProgram({
      wardBusinessSections: [
        { id: "a", kind: "new_members", title: "", body: "", newMembersNames: "Hernández, Pablo" },
        { id: "b", kind: "new_members", title: "", body: "", newMembersNames: "Gonzales, Soraya" },
        { id: "c", kind: "other", title: "", body: "Webster" },
        { id: "d", kind: "other", title: "", body: "Rivera" },
      ],
    });

    expect(parsed.wardBusinessSections).toHaveLength(2);
    expect(countWardBusinessSectionPrintRows(parsed.wardBusinessSections[0])).toBe(2);
    expect(countWardBusinessSectionPrintRows(parsed.wardBusinessSections[1])).toBe(2);
  });
});
