import { describe, expect, it } from "vitest";
import {
  nthSundayOfMonth,
  parseLocalDateFromISO,
  sacramentMeetingProgramKind,
} from "./sacramentProgram";

describe("sacramentMeetingProgramKind", () => {
  it("1st Sunday of March is testimony", () => {
    expect(sacramentMeetingProgramKind("2026-03-01")).toBe("testimony");
  });

  it("2nd Sunday of March is regular (discourses)", () => {
    expect(sacramentMeetingProgramKind("2026-03-08")).toBe("regular");
  });

  it("1st Sunday of April is General Conference weekend", () => {
    expect(sacramentMeetingProgramKind("2026-04-05")).toBe("general_conference");
  });

  it("2nd Sunday of April is testimony", () => {
    expect(sacramentMeetingProgramKind("2026-04-12")).toBe("testimony");
  });

  it("3rd Sunday of April is regular", () => {
    expect(sacramentMeetingProgramKind("2026-04-19")).toBe("regular");
  });

  it("1st Sunday of October is General Conference weekend", () => {
    expect(sacramentMeetingProgramKind("2026-10-04")).toBe("general_conference");
  });

  it("2nd Sunday of October is testimony", () => {
    expect(sacramentMeetingProgramKind("2026-10-11")).toBe("testimony");
  });
});

describe("nthSundayOfMonth", () => {
  it("counts Sundays in month", () => {
    expect(nthSundayOfMonth(parseLocalDateFromISO("2026-04-05"))).toBe(1);
    expect(nthSundayOfMonth(parseLocalDateFromISO("2026-04-12"))).toBe(2);
  });
});
