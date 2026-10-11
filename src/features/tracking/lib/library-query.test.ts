import { describe, expect, it } from "vitest";

import {
  libraryOrderBy,
  mediaConditions,
} from "@/features/tracking/lib/library-query";

const NO_FILTERS = { q: "", type: null, adult: null } as const;

describe("mediaConditions — le 18+", () => {
  it("écarte le 18+ sans la préférence, quoi que dise l'URL", () => {
    for (const adult of [null, "hide", "only"] as const) {
      expect(
        mediaConditions({
          filters: { ...NO_FILTERS, adult },
          includeAdult: false,
        }),
      ).toEqual({ media: { isAdult: false } });
    }
  });

  it("laisse tout passer avec la préférence et sans filtre", () => {
    expect(
      mediaConditions({ filters: NO_FILTERS, includeAdult: true }),
    ).toEqual({});
  });

  it("resserre sur « sans » ou « seulement » avec la préférence", () => {
    expect(
      mediaConditions({
        filters: { ...NO_FILTERS, adult: "hide" },
        includeAdult: true,
      }),
    ).toEqual({ media: { isAdult: false } });
    expect(
      mediaConditions({
        filters: { ...NO_FILTERS, adult: "only" },
        includeAdult: true,
      }),
    ).toEqual({ media: { isAdult: true } });
  });

  it("garde le 18+ quand le terme et le type s'ajoutent", () => {
    const { media } = mediaConditions({
      filters: { q: "frieren", type: "MANGA", adult: null },
      includeAdult: false,
    }) as { media: Record<string, unknown> };

    expect(media.isAdult).toBe(false);
    expect(media.type).toBe("MANGA");
  });
});

describe("mediaConditions — le terme", () => {
  it("cherche dans les trois titres et dans les synonymes", () => {
    const { media } = mediaConditions({
      filters: { ...NO_FILTERS, q: "  snk " },
      includeAdult: true,
    }) as { media: { OR: Record<string, unknown>[] } };

    expect(media.OR.map((condition) => Object.keys(condition)[0])).toEqual([
      "titleRomaji",
      "titleEnglish",
      "titleNative",
      "synonyms",
    ]);
    expect(media.OR[3]).toEqual({
      synonyms: { contains: "snk", mode: "insensitive" },
    });
  });
});

describe("libraryOrderBy", () => {
  it("prend le sens naturel du tri quand l'URL n'en dit rien", () => {
    expect(
      libraryOrderBy({ sort: "title", dir: null, type: null }, "ROMAJI")[0],
    ).toEqual({ media: { titleSortRomaji: { sort: "asc", nulls: "last" } } });
    expect(
      libraryOrderBy({ sort: "score", dir: null, type: null }, "ROMAJI")[0],
    ).toEqual({ score: { sort: "desc", nulls: "last" } });
  });

  it("renverse le sens sans déplacer les vides", () => {
    expect(
      libraryOrderBy({ sort: "score", dir: "ASC", type: null }, "ROMAJI")[0],
    ).toEqual({ score: { sort: "asc", nulls: "last" } });
    expect(
      libraryOrderBy({ sort: "finished", dir: "ASC", type: null }, "ROMAJI")[0],
    ).toEqual({ finishedAt: { sort: "asc", nulls: "last" } });
  });

  it("finit toujours par l'id, pour un ordre total", () => {
    const sorts = [
      "recent",
      "added",
      "title",
      "score",
      "progress",
      "started",
      "finished",
      "year",
      "length",
    ] as const;

    for (const sort of sorts) {
      for (const dir of [null, "ASC", "DESC"] as const) {
        expect(
          libraryOrderBy({ sort, dir, type: null }, "ROMAJI").at(-1),
        ).toEqual({
          id: "asc",
        });
      }
    }
  });

  it("trie le titre dans la langue affichée, repli compris", () => {
    expect(
      libraryOrderBy({ sort: "title", dir: null, type: null }, "ENGLISH")[0],
    ).toEqual({ media: { titleSortEnglish: { sort: "asc", nulls: "last" } } });
    expect(
      libraryOrderBy({ sort: "title", dir: "DESC", type: null }, "NATIVE")[0],
    ).toEqual({ media: { titleSortNative: { sort: "desc", nulls: "last" } } });
  });

  it("trie la longueur sur la colonne du type posé", () => {
    expect(
      libraryOrderBy({ sort: "length", dir: null, type: "ANIME" }, "ROMAJI")[0],
    ).toEqual({ media: { episodes: { sort: "desc", nulls: "last" } } });
    expect(
      libraryOrderBy({ sort: "length", dir: null, type: "MANGA" }, "ROMAJI")[0],
    ).toEqual({ media: { chapters: { sort: "desc", nulls: "last" } } });
  });
});
