import { describe, expect, it } from "vitest";

import {
  scoreBars,
  topGenres,
  watchedHours,
} from "@/features/profile/lib/profile-stats";

describe("scoreBars", () => {
  it("rend les dix paliers, de la demi-étoile à cinq", () => {
    const bars = scoreBars([]);

    expect(bars).toHaveLength(10);
    expect(bars.at(0)?.stars).toBe(0.5);
    expect(bars.at(-1)?.stars).toBe(5);
  });

  it("garde les paliers vides plutôt que de les sauter", () => {
    const bars = scoreBars([{ score: 100, count: 3 }]);

    expect(bars.every((bar) => typeof bar.count === "number")).toBe(true);
    expect(bars.find((bar) => bar.stars === 5)?.count).toBe(3);
    expect(bars.find((bar) => bar.stars === 2.5)?.count).toBe(0);
  });

  it("convertit la note stockée sur 0-100 en étoiles", () => {
    const bars = scoreBars([
      { score: 80, count: 2 },
      { score: 90, count: 1 },
      { score: 70, count: 4 },
    ]);

    expect(bars.find((bar) => bar.stars === 4)?.count).toBe(2);
    expect(bars.find((bar) => bar.stars === 4.5)?.count).toBe(1);
    expect(bars.find((bar) => bar.stars === 3.5)?.count).toBe(4);
  });

  it("fusionne les notes brutes qui tombent sur le même palier", () => {
    /*
      Le cas qui justifie toute la fonction : les notes importées d'AniList occupent les cent
      valeurs, et 85 comme 88 s'arrondissent à 4,5. Un `groupBy` sur la colonne rendrait deux
      lignes ; l'histogramme n'en veut qu'une.

      84 n'aurait pas fait l'affaire — il tombe sur 4 tout rond, ce que le premier jet de ce test
      avait supposé faux. La conversion est celle de `scoreToStars`, à un demi-palier près.
    */
    const bars = scoreBars([
      { score: 85, count: 2 },
      { score: 88, count: 3 },
    ]);

    expect(bars.find((bar) => bar.stars === 4.5)?.count).toBe(5);
  });

  it("ignore les entrées non notées et les zéros", () => {
    const bars = scoreBars([
      { score: null, count: 12 },
      { score: 0, count: 4 },
      { score: 60, count: 1 },
    ]);

    expect(bars.reduce((sum, bar) => sum + bar.count, 0)).toBe(1);
  });
});

describe("topGenres", () => {
  it("compte les genres à travers les œuvres et les classe", () => {
    const bars = topGenres([
      ["Action", "Fantasy"],
      ["Action", "Drama"],
      ["Action"],
      ["Drama"],
    ]);

    expect(bars).toEqual([
      { genre: "Action", count: 3 },
      { genre: "Drama", count: 2 },
      { genre: "Fantasy", count: 1 },
    ]);
  });

  it("départage les ex æquo par ordre alphabétique, pas par ordre d'arrivée", () => {
    // Sans cette règle, deux genres à égalité permuteraient d'un rechargement à l'autre.
    const bars = topGenres([["Zombie"], ["Action"]]);

    expect(bars.map((bar) => bar.genre)).toEqual(["Action", "Zombie"]);
  });

  it("s'arrête à la limite demandée", () => {
    const bars = topGenres(
      [["A"], ["B"], ["C"], ["D"], ["E"], ["F"], ["G"], ["H"], ["I"]],
      3,
    );

    expect(bars).toHaveLength(3);
  });

  it("rend un classement vide pour une bibliothèque vide", () => {
    expect(topGenres([])).toEqual([]);
  });
});

describe("watchedHours", () => {
  it("convertit les épisodes en heures, arrondies", () => {
    expect(watchedHours(0)).toBe(0);
    expect(watchedHours(100)).toBe(40);
    expect(watchedHours(1)).toBe(0);
  });
});
