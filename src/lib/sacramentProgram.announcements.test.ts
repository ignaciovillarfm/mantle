import { describe, expect, it } from "vitest";
import { parseAnnouncementRows, serializeAnnouncementRows } from "./sacramentProgram";

describe("announcement rows", () => {
  it("splits on newlines", () => {
    expect(parseAnnouncementRows("First\nSecond")).toEqual(["First", "Second"]);
  });

  it("splits inline second announcement after Recordamos", () => {
    const raw =
      "26 De mayo Actividad con los Jóvenes - Es una Expo misional (consultas Hna Granados) - Recordamos la actividad de Trek el 5 y 6 de junio";
    expect(parseAnnouncementRows(raw)).toEqual([
      "26 De mayo Actividad con los Jóvenes - Es una Expo misional (consultas Hna Granados)",
      "Recordamos la actividad de Trek el 5 y 6 de junio",
    ]);
  });

  it("splits pasted paragraph with Recordamos separator", () => {
    const raw =
      "26 De mayo Actividad con los Joveneves - Es una Expo misional y se extiende la invitacion a los exmisioneros que quieran particiar ( cualquier consulta comuniquense con la Hna Granados - Recordamos la actividad de Trek para los jovenes el dia 5 y 6 de junio";
    const rows = parseAnnouncementRows(raw);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatch(/^Recordamos la actividad de Trek/);
  });

  it("round-trips through serialize", () => {
    const rows = ["One", "Two"];
    expect(parseAnnouncementRows(serializeAnnouncementRows(rows))).toEqual(rows);
  });
});
