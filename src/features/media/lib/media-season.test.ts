import { describe, expect, it } from "vitest";

import {
  currentSeason,
  nextSeason,
  previousSeason,
  recentSeasons,
  seasonOf,
} from "@/features/media/lib/media-season";

describe("seasonOf", () => {
  it("range chacun des douze mois dans la saison d'AniList", () => {
    expect(seasonOf(1, 2026)).toEqual({ season: "WINTER", seasonYear: 2026 });
    expect(seasonOf(2, 2026)).toEqual({ season: "WINTER", seasonYear: 2026 });
    expect(seasonOf(3, 2026)).toEqual({ season: "SPRING", seasonYear: 2026 });
    expect(seasonOf(5, 2026)).toEqual({ season: "SPRING", seasonYear: 2026 });
    expect(seasonOf(6, 2026)).toEqual({ season: "SUMMER", seasonYear: 2026 });
    expect(seasonOf(8, 2026)).toEqual({ season: "SUMMER", seasonYear: 2026 });
    expect(seasonOf(9, 2026)).toEqual({ season: "FALL", seasonYear: 2026 });
    expect(seasonOf(11, 2026)).toEqual({ season: "FALL", seasonYear: 2026 });
  });

  /**
   * Le seul mois où l'année ne suit pas le calendrier. AniList documente l'hiver comme « décembre à
   * février » : un anime de décembre 2026 est un anime « hiver 2027 ».
   */
  it("rattache décembre à l'hiver de l'année suivante", () => {
    expect(seasonOf(12, 2026)).toEqual({ season: "WINTER", seasonYear: 2027 });
  });
});

describe("nextSeason", () => {
  it("avance d'une saison à l'intérieur de la même année", () => {
    expect(nextSeason({ season: "WINTER", seasonYear: 2026 })).toEqual({
      season: "SPRING",
      seasonYear: 2026,
    });
    expect(nextSeason({ season: "SPRING", seasonYear: 2026 })).toEqual({
      season: "SUMMER",
      seasonYear: 2026,
    });
    expect(nextSeason({ season: "SUMMER", seasonYear: 2026 })).toEqual({
      season: "FALL",
      seasonYear: 2026,
    });
  });

  it("change d'année en passant de l'automne à l'hiver", () => {
    expect(nextSeason({ season: "FALL", seasonYear: 2026 })).toEqual({
      season: "WINTER",
      seasonYear: 2027,
    });
  });

  /** Quatre applications ramènent au point de départ, un an plus tard. */
  it("boucle sur l'année en quatre saisons", () => {
    const start = { season: "SPRING", seasonYear: 2026 } as const;
    const after = [1, 2, 3, 4].reduce(nextSeason, start);

    expect(after).toEqual({ season: "SPRING", seasonYear: 2027 });
  });
});

describe("previousSeason", () => {
  it("recule d'une saison à l'intérieur de la même année", () => {
    expect(previousSeason({ season: "FALL", seasonYear: 2026 })).toEqual({
      season: "SUMMER",
      seasonYear: 2026,
    });
  });

  /** Le pendant du saut d'année de `nextSeason`, et le seul endroit où se tromper de sens. */
  it("change d'année en passant de l'hiver à l'automne", () => {
    expect(previousSeason({ season: "WINTER", seasonYear: 2027 })).toEqual({
      season: "FALL",
      seasonYear: 2026,
    });
  });

  it("défait exactement ce que nextSeason a fait", () => {
    const start = { season: "FALL", seasonYear: 2026 } as const;

    expect(previousSeason(nextSeason(start))).toEqual(start);
  });
});

describe("recentSeasons", () => {
  /**
   * Le premier créneau est la saison **suivante**, pas la saison en cours : c'est ce qui rend le lien
   * « La saison prochaine » de l'accueil exprimable dans la liste du sélecteur.
   */
  it("ouvre sur la saison à venir, puis redescend le temps", () => {
    expect(recentSeasons(4, { season: "SUMMER", seasonYear: 2026 })).toEqual([
      { season: "FALL", seasonYear: 2026 },
      { season: "SUMMER", seasonYear: 2026 },
      { season: "SPRING", seasonYear: 2026 },
      { season: "WINTER", seasonYear: 2026 },
    ]);
  });

  it("franchit les années en descendant", () => {
    const slots = recentSeasons(3, { season: "WINTER", seasonYear: 2026 });

    expect(slots).toEqual([
      { season: "SPRING", seasonYear: 2026 },
      { season: "WINTER", seasonYear: 2026 },
      { season: "FALL", seasonYear: 2025 },
    ]);
  });

  it("rend exactement le nombre de créneaux demandé, sans doublon", () => {
    const slots = recentSeasons(13, { season: "SUMMER", seasonYear: 2026 });
    const seen = new Set(
      slots.map((slot) => `${slot.season}:${slot.seasonYear}`),
    );

    expect(slots).toHaveLength(13);
    expect(seen.size).toBe(13);
  });
});

describe("currentSeason", () => {
  it("déduit la saison de l'instant donné", () => {
    expect(currentSeason(new Date("2026-08-08T12:00:00.000Z"))).toEqual({
      season: "SUMMER",
      seasonYear: 2026,
    });
  });

  /**
   * L'intérêt du fuseau explicite, en un cas.
   *
   * Le 1er janvier 2027 à 00 h 30 à Paris, il est encore le 31 décembre 2026 en UTC. Un calcul sans
   * fuseau donnerait « hiver 2027 » par la branche de décembre — la bonne réponse par accident. Ce
   * test-ci prend l'autre bout : fin novembre à 23 h 30 UTC, on est déjà en décembre à Paris, donc en
   * hiver de l'année suivante, et c'est là qu'un calcul en UTC se tromperait d'un trimestre entier.
   */
  it("raisonne à l'heure de Paris et non en UTC", () => {
    expect(currentSeason(new Date("2026-11-30T23:30:00.000Z"))).toEqual({
      season: "WINTER",
      seasonYear: 2027,
    });
  });
});
