import { describe, expect, it } from "vitest";
import { isGuestSpeakerSlot, type SpeakerSlot } from "@/lib/sacramentProgram";

describe("guest speaker slots", () => {
  it("treats empty guest_name as guest mode (not ward member)", () => {
    const slot: SpeakerSlot = {
      position: 1,
      member_id: null,
      guest_name: "",
      topic: null,
    };
    expect(isGuestSpeakerSlot(slot)).toBe(true);
  });

  it("ward member mode when guest_name is null", () => {
    const slot: SpeakerSlot = {
      position: 1,
      member_id: null,
      guest_name: null,
      topic: null,
    };
    expect(isGuestSpeakerSlot(slot)).toBe(false);
  });
});
