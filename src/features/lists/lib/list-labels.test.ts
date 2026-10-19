import { describe, expect, it } from "vitest";

import {
  itemCountLabel,
  listCountsLine,
  listHeadline,
  sectionHeading,
} from "@/features/lists/lib/list-labels";

describe("itemCountLabel", () => {
  it("dit zéro, un et plusieurs", () => {
    expect(itemCountLabel(0)).toBe("Aucune œuvre");
    expect(itemCountLabel(1)).toBe("1 œuvre");
    expect(itemCountLabel(18)).toBe("18 œuvres");
  });
});

describe("listCountsLine", () => {
  const counts = { total: 17, ready: 8, seen: 0 };

  it("dit « Aucune œuvre » pour toute liste vide", () => {
    expect(
      listCountsLine("WAIT_FOR_END", null, { total: 0, ready: 0, seen: 0 }),
    ).toBe("Aucune œuvre");
  });

  it("annonce le Top d'un classement coupé", () => {
    expect(listCountsLine("RANKING", 10, { ...counts, total: 18 })).toBe(
      "Top 10 · 18 œuvres",
    );
    expect(listCountsLine("RANKING", null, { ...counts, total: 18 })).toBe(
      "18 œuvres",
    );
  });

  it("annonce la progression d'une file", () => {
    expect(
      listCountsLine("WATCHLIST", null, { total: 14, ready: 0, seen: 3 }),
    ).toBe("3 vues sur 14");
    expect(
      listCountsLine("WATCHLIST", null, { total: 14, ready: 0, seen: 0 }),
    ).toBe("14 à voir");
  });

  it("annonce les prêtes d'une attente de fin", () => {
    expect(listCountsLine("WAIT_FOR_END", null, counts)).toBe(
      "8 prêtes sur 17",
    );
    expect(listCountsLine("WAIT_FOR_END", null, { ...counts, ready: 1 })).toBe(
      "1 prête sur 17",
    );
    expect(listCountsLine("WAIT_FOR_END", null, { ...counts, ready: 0 })).toBe(
      "Aucune prête sur 17",
    );
  });
});

describe("listHeadline", () => {
  it("ne répète pas le genre quand le décompte le dit déjà", () => {
    expect(listHeadline("RANKING", 10, "Top 10 · 18 œuvres")).toBe(
      "Top 10 · 18 œuvres",
    );
    expect(listHeadline("SELECTION", null, "4 œuvres")).toBe("4 œuvres");
  });

  it("nomme le genre sinon, y compris pour un classement vide", () => {
    expect(listHeadline("RANKING", 10, "Aucune œuvre")).toBe(
      "Classement · Aucune œuvre",
    );
    expect(listHeadline("WAIT_FOR_END", null, "8 prêtes sur 17")).toBe(
      "Quand c'est fini · 8 prêtes sur 17",
    );
  });
});

describe("sectionHeading", () => {
  it("ne double pas le chiffre du Top", () => {
    expect(sectionHeading("top", "Top 10", 10)).toBe("Top 10");
    expect(sectionHeading("ready", "Prêtes", 8)).toBe("Prêtes (8)");
  });
});
