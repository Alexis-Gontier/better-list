import { describe, expect, it } from "vitest";

import { rankRecommendations } from "@/app/(app)/(home)/_lib/home-recommendations";

const media = (id: number) => ({ id });
const ids = (ranked: { media: { id: number } }[]) =>
  ranked.map((item) => item.media.id);

describe("rankRecommendations", () => {
  it("fait passer une œuvre recommandée par plusieurs séries devant la première d'une seule", () => {
    const ranked = rankRecommendations(
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
      { exclude: new Set() },
    );

    // 9 : trois quarts de point, deux fois ; 1 et 4 : un point chacun.
    expect(ids(ranked)[0]).toBe(9);
  });

  it("garde l'ordre d'AniList à l'intérieur d'une même liste", () => {
    const ranked = rankRecommendations(
      [{ seed: "A", recommendations: [media(1), media(2), media(3)] }],
      { exclude: new Set() },
    );

    expect(ids(ranked)).toEqual([1, 2, 3]);
  });

  it("retire ce qui est déjà dans la bibliothèque", () => {
    const ranked = rankRecommendations(
      [{ seed: "A", recommendations: [media(1), media(2), media(3)] }],
      { exclude: new Set([2]) },
    );

    expect(ids(ranked)).toEqual([1, 3]);
  });

  it("nomme la série où l'œuvre était le mieux placée", () => {
    const ranked = rankRecommendations(
      [
        {
          seed: "A",
          recommendations: [media(1), media(2), media(3), media(9)],
        },
        { seed: "B", recommendations: [media(9), media(5)] },
      ],
      { exclude: new Set() },
    );

    expect(ranked.find((item) => item.media.id === 9)?.because).toBe("B");
  });

  it("départage deux scores égaux par l'ordre des séries", () => {
    const ranked = rankRecommendations(
      [
        { seed: "A", recommendations: [media(1)] },
        { seed: "B", recommendations: [media(2)] },
      ],
      { exclude: new Set() },
    );

    expect(ids(ranked)).toEqual([1, 2]);
  });

  it("rend une liste vide quand aucune série n'a de recommandation", () => {
    expect(
      rankRecommendations([{ seed: "A", recommendations: [] }], {
        exclude: new Set(),
      }),
    ).toEqual([]);
  });
});
