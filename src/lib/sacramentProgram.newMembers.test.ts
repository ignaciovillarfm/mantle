import { describe, expect, it } from "vitest";
import {
  formatNewMembersNames,
  localizeNewMembersMembersLine,
  newMembersDisplayValues,
  parseNewMembersNames,
  splitNewMembersTemplateBody,
} from "./sacramentProgram";

describe("new members names", () => {
  it("parses family and members from comma-separated storage", () => {
    expect(parseNewMembersNames("García, Juan y María")).toEqual({
      familyName: "García",
      familyMembers: "Juan y María",
    });
  });

  it("formats family and members for storage", () => {
    expect(formatNewMembersNames("García", "Juan y María")).toBe("García, Juan y María");
  });

  it("localizes English children labels for Spanish programs", () => {
    expect(
      localizeNewMembersMembersLine("Maria Paula. Children: Lucy and Teo", "es"),
    ).toBe("Maria Paula. Hijos: Lucy y Teo");
  });

  it("resolves display values from newMembersNames with Spanish localization", () => {
    expect(
      newMembersDisplayValues(
        { newMembersNames: "Daniel, Maria Paula. Children: Lucy and Teo", body: "" },
        "es",
      ),
    ).toEqual({
      familyName: "Daniel",
      familyMembers: "Maria Paula. Hijos: Lucy y Teo",
    });
  });

  it("does not treat stored names line as template when splitting", () => {
    const namesOnly = "Daniel, Maria Paula. Children: Lucy and Teo";
    expect(splitNewMembersTemplateBody(namesOnly)).toEqual({
      before: namesOnly,
      after: "",
    });
    const esTemplate =
      "Los siguientes hermanos han movido sus registros a nuestro barrio [Familia y Nombres]. Los que deseen expresar un voto de bienvenida al barrio, pueden hacerlo levantando la mano";
    expect(splitNewMembersTemplateBody(esTemplate).before).toContain("Los siguientes hermanos");
    expect(splitNewMembersTemplateBody(esTemplate).before).not.toContain("Children");
  });

  it("splits Spanish template around placeholder", () => {
    const body =
      "Los siguientes hermanos han movido sus registros a nuestro barrio [Familia y Nombres]. Los que deseen expresar un voto de bienvenida al barrio, pueden hacerlo levantando la mano";
    expect(splitNewMembersTemplateBody(body)).toEqual({
      before: "Los siguientes hermanos han movido sus registros a nuestro barrio",
      after:
        "Los que deseen expresar un voto de bienvenida al barrio, pueden hacerlo levantando la mano",
    });
  });
});
