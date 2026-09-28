import { describe, expect, it } from "vitest";

import { drawRecommendations } from "@/app/(app)/(home)/_lib/home-recommendations";

const media = (id: number) => ({ id });
const ids = (ranked: { media: { id: number } }[]) =>
  ranked.map((item) => item.media.id);

/**
 * Un hasard constant : la clé `r ** (1 / score)` croît alors avec le score, et le tirage rend le
 * classement pur. C'est ce qui permet de tester le score sans tester le hasard.
 */
const flat = () => 0.5;

/** Un hasard rejoué depuis une liste, pour les tests qui portent sur le tirage lui-même. */
const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length] ?? 0.5;
};

describe("drawRecommendations", () => {
  it("fait passer une œuvre recommandée par plusieurs séries devant la première d'une seule", () => {
    const drawn = drawRecommendations(
      [
        {
          seed: "A",
          recommendations: [media(1), media(9), media(2), media(3)],
        },
        {
          seed: "B",
          recommendations: [media(4), media(9), media(5), media(6)],
        },
      ],
      { exclude: new Set(), count: 20, random: flat },
    );

    // 9 : trois quarts de point, deux fois ; 1 et 4 : un point chacun.
    expect(ids(drawn)[0]).toBe(9);
  });

  it("garde l'ordre d'AniList à l'intérieur d'une même liste, à hasard égal", () => {
    const drawn = drawRecommendations(
      [{ seed: "A", recommendations: [media(1), media(2), media(3)] }],
      { exclude: new Set(), count: 20, random: flat },
    );

    expect(ids(drawn)).toEqual([1, 2, 3]);
  });

  it("retire ce qui est déjà dans la bibliothèque", () => {
    const drawn = drawRecommendations(
      [{ seed: "A", recommendations: [media(1), media(2), media(3)] }],
      { exclude: new Set([2]), count: 20, random: flat },
    );

    expect(ids(drawn)).toEqual([1, 3]);
  });

  it("nomme la série où l'œuvre était le mieux placée", () => {
    const drawn = drawRecommendations(
      [
        {
          seed: "A",
          recommendations: [media(1), media(2), media(3), media(9)],
        },
        { seed: "B", recommendations: [media(9), media(5)] },
      ],
      { exclude: new Set(), count: 20, random: flat },
    );

    expect(drawn.find((item) => item.media.id === 9)?.because).toBe("B");
  });

  it("réserve une place à chaque série, même quand les autres ont de meilleurs scores", () => {
    const drawn = drawRecommendations(
      [
        {
          seed: "A",
          recommendations: [media(1), media(9), media(2), media(3)],
        },
        {
          seed: "B",
          recommendations: [media(4), media(9), media(5), media(6)],
        },
        // Tout ce que C propose est déjà en bibliothèque, sauf sa dernière.
        {
          seed: "C",
          recommendations: [media(7), media(8), media(10), media(11)],
        },
      ],
      { exclude: new Set([7, 8, 10]), count: 3, random: flat },
    );

    expect(ids(drawn)).toContain(11);
    expect(drawn).toHaveLength(3);
  });

  it("laisse le hasard faire passer une œuvre moins bien classée devant", () => {
    const seeds = [{ seed: "A", recommendations: [media(1), media(2)] }];

    // 1 vaut un point, 2 un demi. Clés : 0,2 ** 1 = 0,2 contre 0,9 ** 2 = 0,81.
    const drawn = drawRecommendations(seeds, {
      exclude: new Set(),
      count: 20,
      random: sequence([0.2, 0.9]),
    });

    expect(ids(drawn)).toEqual([2, 1]);
  });

  it("s'arrête au nombre demandé", () => {
    const drawn = drawRecommendations(
      [
        {
          seed: "A",
          recommendations: [media(1), media(2), media(3), media(4)],
        },
      ],
      { exclude: new Set(), count: 2, random: flat },
    );

    expect(ids(drawn)).toEqual([1, 2]);
  });

  it("rend une liste vide quand aucune série n'a de recommandation", () => {
    expect(
      drawRecommendations([{ seed: "A", recommendations: [] }], {
        exclude: new Set(),
        count: 20,
      }),
    ).toEqual([]);
  });
});
