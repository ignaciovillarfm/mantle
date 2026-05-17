import { describe, expect, it } from "vitest";
import { sacramentPrintDocumentTitle } from "./sacramentProgram";

describe("sacramentPrintDocumentTitle", () => {
  it("combines ward name and program date for PDF default filename", () => {
    expect(sacramentPrintDocumentTitle("West Park", "17 de mayo")).toBe("West Park - 17 de mayo");
  });

  it("strips characters invalid in filenames", () => {
    expect(sacramentPrintDocumentTitle('Barrio "A"', "17 de mayo")).toBe('Barrio A - 17 de mayo');
  });
});
