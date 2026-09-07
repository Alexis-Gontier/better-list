import { describe, expect, it } from "vitest";

import {
  groupIntoTiers,
  SCORE_TIERS,
  TIER_BOARD,
  tierIdForScore,
  UNRATED_TIER,
} from "@/features/tracking/lib/score-tiers";

type Row = { mediaId: number; score: number | null; title: string };

const row = (mediaId: number, score: number | null, title = `t${mediaId}`) =>
  ({ mediaId, score, title }) satisfies Row;

/** Ce qu'une ligne du plateau contient, réduit à ce qu'on vérifie. */
function boardOf(items: Row[]) {
  return groupIntoTiers(items).map((tier) => [
    tier.tier.label,
    tier.items.map((item) => item.mediaId),
  ]);
}

describe("SCORE_TIERS", () => {
  /**
   * Onze crans et pas dix : « noté zéro » est un jugement, distinct de « pas encore noté »
   * (docs/PRODUCT.md §4.2). Le supprimer rendrait un 0 stocké inatteignable au glisser.
   */
  it("va de 5 à 0 par demies, dans l'ordre décroissant", () => {
    expect(SCORE_TIERS).toHaveLength(11);
    expect(SCORE_TIERS[0]).toMatchObject({ stars: 5, score: 100, label: "5" });
    expect(SCORE_TIERS[1]).toMatchObject({ stars: 4.5, score: 90 });
    expect(SCORE_TIERS.at(-1)).toMatchObject({
      stars: 0,
      score: 0,
      label: "0",
    });
  });

  /**
   * Le dégradé est écrit à la main, à côté d'une échelle qui se calcule : allonger l'une sans
   * l'autre laisserait une bande sans couleur, et personne ne le verrait avant l'écran.
   */
  it("donne à chaque cran sa propre couleur", () => {
    const colors = SCORE_TIERS.map((tier) => tier.color);

    expect(colors.every((color) => typeof color === "string")).toBe(true);
    expect(new Set(colors).size).toBe(SCORE_TIERS.length);
    expect(UNRATED_TIER.color).toBeNull();
  });

  it("porte des identifiants uniques, réserve comprise", () => {
    const ids = TIER_BOARD.map((tier) => tier.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TIER_BOARD.at(-1)).toBe(UNRATED_TIER);
  });
});

describe("tierIdForScore", () => {
  it("range une note sur son cran exact", () => {
    expect(tierIdForScore(100)).toBe(SCORE_TIERS[0]?.id);
    expect(tierIdForScore(0)).toBe(SCORE_TIERS.at(-1)?.id);
  });

  /**
   * Une note importée d'AniList tombe entre deux crans : elle se range sur le plus proche, comme
   * elle s'affiche (`scoreToStars`). 85 est à mi-chemin, et l'arrondi au supérieur est celui de
   * l'affichage — les deux ne doivent pas se contredire.
   */
  it("range une note importée sur le cran le plus proche", () => {
    expect(tierIdForScore(87)).toBe(tierIdForScore(90));
    expect(tierIdForScore(85)).toBe(tierIdForScore(90));
    expect(tierIdForScore(83)).toBe(tierIdForScore(80));
  });

  it("envoie une note absente dans la réserve", () => {
    expect(tierIdForScore(null)).toBe(UNRATED_TIER.id);
  });
});

describe("groupIntoTiers", () => {
  it("rend toutes les lignes, même vides", () => {
    expect(groupIntoTiers([])).toHaveLength(TIER_BOARD.length);
  });

  it("place chaque œuvre sous son cran", () => {
    expect(boardOf([row(1, 100), row(2, 50), row(3, null)])).toEqual(
      expect.arrayContaining([
        ["5", [1]],
        ["2,5", [2]],
        [UNRATED_TIER.label, [3]],
      ]),
    );
  });

  /**
   * L'ordre dans un cran n'est pas stocké : il se déduit de la note exacte, ce qui range d'elles-mêmes
   * les notes importées à l'intérieur du palier. À note égale, le titre départage — sans quoi deux
   * rendus successifs pourraient ne pas donner le même ordre.
   */
  it("trie un cran par note exacte décroissante, puis par titre", () => {
    const items = [
      row(1, 87, "Zèbre"),
      row(2, 90, "Bêta"),
      row(3, 90, "Alpha"),
      row(4, 88, "Chat"),
    ];

    expect(groupIntoTiers(items)[1]?.items.map((item) => item.mediaId)).toEqual(
      [3, 2, 4, 1],
    );
  });

  it("trie la réserve par titre, où aucune note ne départage", () => {
    const items = [
      row(1, null, "Zèbre"),
      row(2, null, "Éclair"),
      row(3, null, "Alpha"),
    ];

    expect(
      groupIntoTiers(items)
        .at(-1)
        ?.items.map((item) => item.mediaId),
    ).toEqual([3, 2, 1]);
  });
});
