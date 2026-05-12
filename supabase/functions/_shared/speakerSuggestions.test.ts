import { describe, expect, it } from "vitest";
import { buildSpeakerSuggestions, sortByRotation } from "./speakerSuggestions.ts";

describe("speakerSuggestions", () => {
  const members = [
    {
      id: "1",
      name: "Ada",
      last_pulpit_date: "2024-01-01",
      is_youth: false,
      organization_id: "o1",
      organization_name: "Relief Society",
    },
    {
      id: "2",
      name: "Ben",
      last_pulpit_date: "2025-01-01",
      is_youth: true,
      organization_id: "o2",
      organization_name: "YM",
    },
    {
      id: "3",
      name: "Cara",
      last_pulpit_date: null,
      is_youth: false,
      organization_id: "o1",
      organization_name: "Relief Society",
    },
  ];

  it("sorts by oldest pulpit first with nulls early", () => {
    const s = sortByRotation(members);
    expect(s[0].id).toBe("3");
    expect(s[1].id).toBe("1");
    expect(s[2].id).toBe("2");
  });

  it("excludes assigned and prefers youth + org spread", () => {
    const ex = new Set<string>(["3"]);
    const out = buildSpeakerSuggestions(members, ex, 5);
    expect(out.find((x) => x.member_id === "3")).toBeUndefined();
    expect(out.some((x) => x.member_id === "2")).toBe(true);
  });
});
