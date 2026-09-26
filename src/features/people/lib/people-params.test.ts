import { describe, expect, it } from "vitest";

import {
  loadPeopleParams,
  serializePeopleParams,
  toPage,
} from "@/features/people/lib/people-params";

describe("loadPeopleParams", () => {
  it("retombe sur les défauts quand l'URL est fausse", () => {
    expect(
      loadPeopleParams(new URLSearchParams("page=abc&onglet=tout")),
    ).toEqual({ page: 1, onglet: null });
  });

  it("lit une page et un onglet valides", () => {
    expect(
      loadPeopleParams(new URLSearchParams("page=3&onglet=anime")),
    ).toEqual({ page: 3, onglet: "anime" });
  });
});

describe("toPage", () => {
  it("borne la page à 1 au minimum", () => {
    expect(toPage(-2)).toBe(1);
    expect(toPage(0)).toBe(1);
    expect(toPage(4)).toBe(4);
  });
});

describe("serializePeopleParams", () => {
  it("efface la page par défaut de l'adresse", () => {
    expect(
      serializePeopleParams("/staff/1", { page: 1, onglet: "doublage" }),
    ).toBe("/staff/1?onglet=doublage");
    expect(serializePeopleParams("/character/40", { page: 2 })).toBe(
      "/character/40?page=2",
    );
  });
});
