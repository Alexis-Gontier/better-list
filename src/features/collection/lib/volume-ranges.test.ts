import { describe, expect, it } from "vitest";

import {
  applyVolumeRange,
  formatVolumeRanges,
  missingVolumes,
  volumeGaps,
} from "@/features/collection/lib/volume-ranges";

describe("missingVolumes", () => {
  it("rend les creux internes et la traîne", () => {
    expect(missingVolumes([1, 2, 3, 5, 6], 8)).toEqual([4, 7, 8]);
  });

  it("ne rend rien sur une série complète", () => {
    expect(missingVolumes([1, 2, 3], 3)).toEqual([]);
  });

  it("rend tout quand l'étagère est vide", () => {
    expect(missingVolumes([], 3)).toEqual([1, 2, 3]);
  });

  it("ignore un numéro au-delà du total", () => {
    // Une édition dont le `volumesTotal` a été corrigé à la baisse — la saisie, elle, reste.
    expect(missingVolumes([1, 2, 9], 3)).toEqual([3]);
  });
});

describe("formatVolumeRanges", () => {
  it("écrit les isolés et replie les suites de trois", () => {
    expect(formatVolumeRanges([11, 12, 29, 63, 64, 65])).toBe(
      "11, 12, 29, 63 → 65",
    );
  });

  it("laisse une paire consécutive en clair", () => {
    // Le seuil est à trois : « 11 → 12 » coûterait deux caractères de plus que « 11, 12 ».
    expect(formatVolumeRanges([11, 12])).toBe("11, 12");
  });

  it("replie une suite de trois", () => {
    expect(formatVolumeRanges([4, 5, 6])).toBe("4 → 6");
  });

  it("trie ce qu'on lui donne dans le désordre", () => {
    expect(formatVolumeRanges([9, 3, 1, 2])).toBe("1 → 3, 9");
  });

  it("rend une chaîne vide sans numéro", () => {
    expect(formatVolumeRanges([])).toBe("");
  });
});

describe("volumeGaps", () => {
  it("dit complète quand le total est connu et sans trou", () => {
    expect(volumeGaps([1, 2, 3], 3)).toEqual({ missing: [], isComplete: true });
  });

  it("rend la traîne quand le total est connu", () => {
    expect(volumeGaps([1, 2], 5)).toEqual({
      missing: [3, 4, 5],
      isComplete: false,
    });
  });

  it("sans total, ne signale que les creux internes", () => {
    // Le 5 et au-delà sont peut-être à paraître : on n'en dit rien.
    expect(volumeGaps([1, 3, 4], null)).toEqual({
      missing: [2],
      isComplete: false,
    });
  });

  it("sans total, n'affirme jamais qu'une série est complète", () => {
    expect(volumeGaps([1, 2, 3], null)).toEqual({
      missing: [],
      isComplete: false,
    });
  });

  it("sans total et sans tome, ne rend rien", () => {
    expect(volumeGaps([], null)).toEqual({ missing: [], isComplete: false });
  });

  it("un total à zéro n'est pas une collection achevée", () => {
    expect(volumeGaps([], 0)).toEqual({ missing: [], isComplete: false });
  });
});

describe("applyVolumeRange", () => {
  it("ajoute une plage sans doublonner l'existant", () => {
    expect(applyVolumeRange([1, 5], { from: 4, to: 6, owned: true })).toEqual([
      1, 4, 5, 6,
    ]);
  });

  it("retire une plage et laisse le reste", () => {
    expect(
      applyVolumeRange([1, 2, 3, 9], { from: 2, to: 3, owned: false }),
    ).toEqual([1, 9]);
  });

  it("rend une liste triée quoi qu'on lui donne", () => {
    expect(applyVolumeRange([9, 1], { from: 5, to: 5, owned: true })).toEqual([
      1, 5, 9,
    ]);
  });
});
