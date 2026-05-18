import { describe, expect, it } from "vitest";
import {
  suggestTestimonyMessageId,
  testimonyIdsUsedWithinMonths,
  TESTIMONY_MESSAGES,
} from "./sacramentTestimonyMessages";

describe("testimonyIdsUsedWithinMonths", () => {
  it("excludes usage outside the window and custom ids", () => {
    const usage = [
      { id: "packer-share", date: "2026-04-05" },
      { id: "custom", date: "2026-04-12" },
      { id: "bednar-knowledge", date: "2026-01-05" },
    ];
    const used = testimonyIdsUsedWithinMonths(usage, "2026-05-03", 2);
    expect(used.has("packer-share")).toBe(true);
    expect(used.has("custom")).toBe(false);
    expect(used.has("bednar-knowledge")).toBe(false);
  });
});

describe("suggestTestimonyMessageId", () => {
  it("picks the first preset not used in the last two months", () => {
    const usage = [{ id: "packer-share", date: "2026-04-05" }];
    const id = suggestTestimonyMessageId(usage, "2026-05-03");
    expect(id).toBe(TESTIMONY_MESSAGES[1].id);
  });

  it("falls back to the least recently used when all presets were used", () => {
    const usage = TESTIMONY_MESSAGES.map((m, i) => ({
      id: m.id,
      date: `2026-04-${String(i + 1).padStart(2, "0")}`,
    }));
    const id = suggestTestimonyMessageId(usage, "2026-05-03");
    expect(id).toBe("packer-share");
  });
});
