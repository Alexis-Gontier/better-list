import { describe, expect, it } from "vitest";

import {
  MAX_PER_PAGE,
  MIN_MEDIA_YEAR,
  searchFormSchema,
  searchMediaInputSchema,
  sortFieldHasDirection,
  toAniListSort,
} from "@/features/media/schemas/search-media.schema";

/**
 * Ce schéma est la frontière entre l'URL et AniList : tout y arrive en chaîne de caractères ou
 * pas du tout. Ses défauts font aussi partie de la clé de cache des lectures — une régression ici
 * dupliquerait silencieusement les entrées du cache.
 */
describe("searchMediaInputSchema", () => {
  it("applique les défauts de pagination et éteint le filtre adulte", () => {
    const params = searchMediaInputSchema.parse({});

    expect(params.page).toBe(1);
    expect(params.perPage).toBe(20);
    expect(params.includeAdult).toBe(false);
  });

  it("convertit les nombres qui arrivent de l'URL en chaînes", () => {
    const params = searchMediaInputSchema.parse({
      page: "2",
      perPage: "50",
      seasonYear: "2024",
    });

    expect(params.page).toBe(2);
    expect(params.perPage).toBe(50);
    expect(params.seasonYear).toBe(2024);
  });

  it("nettoie la recherche des espaces de bord", () => {
    expect(searchMediaInputSchema.parse({ search: "  frieren " }).search).toBe(
      "frieren",
    );
  });

  it("refuse une recherche vide plutôt que d'interroger AniList pour rien", () => {
    expect(searchMediaInputSchema.safeParse({ search: "   " }).success).toBe(
      false,
    );
  });

  it("plafonne `perPage` pour ne pas dépasser la page maximale d'AniList", () => {
    expect(
      searchMediaInputSchema.safeParse({ perPage: MAX_PER_PAGE + 1 }).success,
    ).toBe(false);
  });

  it("borne les années au catalogue réel", () => {
    expect(
      searchMediaInputSchema.safeParse({ seasonYear: MIN_MEDIA_YEAR - 1 })
        .success,
    ).toBe(false);
  });

  it("rejette une valeur d'énumération inconnue", () => {
    expect(searchMediaInputSchema.safeParse({ type: "MOVIE" }).success).toBe(
      false,
    );
    expect(searchMediaInputSchema.safeParse({ type: "ANIME" }).success).toBe(
      true,
    );
  });

  it("borne les listes de genres et de tags", () => {
    expect(
      searchMediaInputSchema.safeParse({ genres: ["Action", "Comedy"] })
        .success,
    ).toBe(true);
    // Une liste vide n'est pas un filtre : elle doit être absente, pas vide.
    expect(searchMediaInputSchema.safeParse({ genres: [] }).success).toBe(
      false,
    );
    expect(
      searchMediaInputSchema.safeParse({
        tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
      }).success,
    ).toBe(false);
  });
});

/**
 * `MediaSort` encode la direction dans le nom de la valeur (`SCORE` / `SCORE_DESC`). On expose donc
 * champ et direction séparément, et on recompose ici — c'est ce qui permet un bouton de direction
 * générique dans la barre de filtres.
 */
describe("toAniListSort", () => {
  it("suffixe le champ en ordre décroissant", () => {
    expect(toAniListSort("SCORE", "DESC")).toEqual(["SCORE_DESC"]);
    expect(toAniListSort("POPULARITY", "DESC")).toEqual(["POPULARITY_DESC"]);
  });

  it("laisse le champ nu en ordre croissant", () => {
    expect(toAniListSort("SCORE", "ASC")).toEqual(["SCORE"]);
    expect(toAniListSort("START_DATE", "ASC")).toEqual(["START_DATE"]);
  });

  /**
   * `SEARCH_MATCH` n'a pas de pendant ascendant chez AniList, et « les moins pertinents d'abord »
   * ne veut rien dire. La direction doit être ignorée, pas suffixée — sinon AniList rejette la
   * requête sur une valeur d'énumération inexistante.
   */
  it("ignore la direction sur un champ qui n'en a pas", () => {
    expect(toAniListSort("SEARCH_MATCH", "DESC")).toEqual(["SEARCH_MATCH"]);
    expect(toAniListSort("SEARCH_MATCH", "ASC")).toEqual(["SEARCH_MATCH"]);
    expect(sortFieldHasDirection("SEARCH_MATCH")).toBe(false);
    expect(sortFieldHasDirection("SCORE")).toBe(true);
  });
});

describe("searchFormSchema", () => {
  /**
   * Le filtre 18+ se dérive de la préférence du compte, côté serveur. S'il redevenait un
   * paramètre accepté depuis le client, il suffirait de l'ajouter à l'URL pour le contourner.
   */
  it("ignore `includeAdult` fourni par le client", () => {
    const params = searchFormSchema.parse({ includeAdult: true });

    expect(params).not.toHaveProperty("includeAdult");
  });
});
