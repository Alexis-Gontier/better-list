import { describe, expect, it } from "vitest";

import {
  listProgress,
  listSections,
  type SectionInput,
  sectionCounts,
} from "@/features/lists/lib/list-sections";

/** Une œuvre réduite à ce qui décide de sa section ; `item` est son nom, pour lire les assertions. */
function input(
  item: string,
  mediaStatus: SectionInput<string>["mediaStatus"] = "FINISHED",
  entryStatus: SectionInput<string>["entryStatus"] = null,
): SectionInput<string> {
  return { item, mediaStatus, entryStatus };
}

const names = (section: { items: { item: string }[] } | undefined) =>
  section?.items.map(({ item }) => item);

describe("listSections", () => {
  it("rend une liste vide sans aucune section", () => {
    expect(listSections("WAIT_FOR_END", null, [])).toEqual([]);
  });

  it("garde une sélection en un seul bloc sans intitulé", () => {
    const sections = listSections("SELECTION", null, [input("a"), input("b")]);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ key: "all", label: null });
  });

  it("numérote un classement dans l'ordre de la liste", () => {
    const [all] = listSections("RANKING", null, [input("a"), input("b")]);
    expect(all?.items.map(({ rank }) => rank)).toEqual([1, 2]);
  });

  it("coupe un classement en Top N et Prétendants, sans renuméroter", () => {
    const sections = listSections("RANKING", 2, [
      input("a"),
      input("b"),
      input("c"),
    ]);
    expect(sections.map(({ label }) => label)).toEqual([
      "Top 2",
      "Prétendants",
    ]);
    expect(sections[1]?.items).toEqual([{ item: "c", rank: 3 }]);
  });

  it("ne coupe pas quand la ligne dépasse la liste", () => {
    const sections = listSections("RANKING", 10, [input("a"), input("b")]);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.key).toBe("all");
  });

  it("ignore la ligne de coupe hors classement", () => {
    expect(listSections("SELECTION", 1, [input("a"), input("b")])).toHaveLength(
      1,
    );
  });

  it("range à part, repliées, les œuvres vues d'une file", () => {
    const sections = listSections("WATCHLIST", null, [
      input("a", "FINISHED", "COMPLETED"),
      input("b", "FINISHED", "PLANNING"),
      input("c", "RELEASING", null),
    ]);
    expect(sections.map(({ key }) => key)).toEqual(["todo", "seen"]);
    expect(names(sections[0])).toEqual(["b", "c"]);
    expect(sections[1]).toMatchObject({ label: "Déjà vues", collapsed: true });
  });

  it("ne compte pas un abandon comme vu", () => {
    const sections = listSections("WATCHLIST", null, [
      input("a", "FINISHED", "DROPPED"),
    ]);
    expect(sections.map(({ key }) => key)).toEqual(["todo"]);
  });

  it("sépare prêtes et en parution dans une attente de fin", () => {
    const sections = listSections("WAIT_FOR_END", null, [
      input("finie", "FINISHED"),
      input("annulee", "CANCELLED"),
      input("en-cours", "RELEASING"),
      input("pause", "HIATUS"),
      input("a-venir", "NOT_YET_RELEASED"),
      input("inconnue", null),
      input("lue", "FINISHED", "COMPLETED"),
    ]);
    expect(sections.map(({ key }) => key)).toEqual([
      "ready",
      "releasing",
      "seen",
    ]);
    expect(names(sections[0])).toEqual(["finie", "annulee"]);
    expect(names(sections[1])).toEqual([
      "en-cours",
      "pause",
      "a-venir",
      "inconnue",
    ]);
    expect(names(sections[2])).toEqual(["lue"]);
  });

  it("garde le rang de la liste entière dans chaque section", () => {
    const [ready] = listSections("WAIT_FOR_END", null, [
      input("en-cours", "RELEASING"),
      input("finie", "FINISHED"),
    ]);
    expect(ready?.items).toEqual([{ item: "finie", rank: 2 }]);
  });
});

describe("sectionCounts", () => {
  it("compte les prêtes et les vues", () => {
    const sections = listSections("WAIT_FOR_END", null, [
      input("finie", "FINISHED"),
      input("en-cours", "RELEASING"),
      input("lue", "FINISHED", "COMPLETED"),
    ]);
    expect(sectionCounts(sections)).toEqual({ ready: 1, seen: 1 });
  });
});

describe("listProgress", () => {
  it("fait avancer une file par ce qu'on a vu", () => {
    expect(listProgress("WATCHLIST", { total: 4, ready: 0, seen: 1 })).toEqual({
      ratio: 0.25,
      label: "1 sur 4 vues",
    });
  });

  it("mesure une attente sur ce qu'il reste à lire", () => {
    expect(
      listProgress("WAIT_FOR_END", { total: 10, ready: 3, seen: 4 }),
    ).toEqual({ ratio: 0.5, label: "3 sur 6 prêtes" });
  });

  it("n'en dessine pas pour un classement, une sélection, ou une attente épuisée", () => {
    expect(listProgress("RANKING", { total: 5, ready: 5, seen: 0 })).toBeNull();
    expect(
      listProgress("SELECTION", { total: 5, ready: 0, seen: 0 }),
    ).toBeNull();
    expect(
      listProgress("WAIT_FOR_END", { total: 2, ready: 0, seen: 2 }),
    ).toBeNull();
  });
});
