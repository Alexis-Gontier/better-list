import { describe, expect, it } from "vitest";

import { routes } from "@/config/routes";
import {
  EMPTY_QUERY_SORT,
  loadSearchFilters,
  parseSeasonSlotValue,
  resolveSort,
  seasonSlotOptions,
  seasonSlotValue,
  serializeSearchFilters,
} from "@/features/media/lib/search-params";

describe("resolveSort", () => {
  it("sert les tendances quand aucun terme n'est saisi", () => {
    expect(resolveSort({ q: "", sort: "SEARCH_MATCH" })).toBe(EMPTY_QUERY_SORT);
  });

  it("traite une saisie faite d'espaces comme une absence de terme", () => {
    expect(resolveSort({ q: "   ", sort: "SEARCH_MATCH" })).toBe(
      EMPTY_QUERY_SORT,
    );
  });

  it("rend la pertinence dès qu'il y a un terme à comparer", () => {
    expect(resolveSort({ q: "frieren", sort: "SEARCH_MATCH" })).toBe(
      "SEARCH_MATCH",
    );
  });

  /**
   * Le cas qui délimite la règle : sans lui, un tri choisi serait écrasé, et le sélecteur de tri
   * deviendrait sans effet sur une page d'arrivée — c'est-à-dire là où on s'en sert le plus.
   */
  it("ne touche pas à un tri explicitement demandé, même sans terme", () => {
    expect(resolveSort({ q: "", sort: "TITLE_ROMAJI" })).toBe("TITLE_ROMAJI");
    expect(resolveSort({ q: "", sort: "SCORE" })).toBe("SCORE");
  });
});

describe("le créneau de saison", () => {
  it("fait l'aller-retour sans rien perdre", () => {
    const slot = { season: "SUMMER", seasonYear: 2026 } as const;

    expect(parseSeasonSlotValue(seasonSlotValue(slot))).toEqual({
      season: "SUMMER",
      year: 2026,
    });
  });

  /**
   * La valeur composite vient d'un `CommandItem`, donc d'une chaîne qui a traversé le DOM. Un
   * découpage naïf y renverrait `undefined` en guise de saison, et l'URL gagnerait `?season=undefined`
   * — un filtre que personne n'a demandé et que rien à l'écran n'expliquerait.
   */
  it("refuse une valeur qui n'est pas un créneau", () => {
    expect(parseSeasonSlotValue("n'importe quoi")).toEqual({
      season: null,
      year: null,
    });
    expect(parseSeasonSlotValue("SUMMER")).toEqual({
      season: "SUMMER",
      year: null,
    });
  });

  it("propose des créneaux libellés en français, du plus récent au plus ancien", () => {
    const options = seasonSlotOptions({ season: "SUMMER", seasonYear: 2026 });

    expect(options[0]).toEqual({
      value: "FALL:2026",
      label: "Automne 2026",
    });
    expect(options[1]).toEqual({ value: "SUMMER:2026", label: "Été 2026" });
  });
});

/**
 * Le lien « Voir tout » des rangées saisonnières de l'accueil, vérifié **de bout en bout** : ce que
 * le sérialiseur écrit, le chargeur doit le relire à l'identique.
 *
 * C'est la seule garantie qui compte ici. Le lien est construit d'un côté de l'application et
 * interprété de l'autre ; tester l'un sans l'autre laisserait passer exactement le défaut qu'on
 * cherche à éviter — une adresse qui a l'air juste et sur laquelle la saison se perd en chemin.
 */
describe("l'aller-retour saison dans l'URL", () => {
  it("relit ce que le lien de l'accueil a écrit", async () => {
    const href = serializeSearchFilters(routes.search, {
      type: "ANIME",
      season: "SUMMER",
      year: 2026,
      sort: "POPULARITY",
      dir: "DESC",
    });

    const { searchParams } = new URL(href, "https://exemple.test");
    const filters = await loadSearchFilters(
      Object.fromEntries(searchParams.entries()),
    );

    expect(filters.season).toBe("SUMMER");
    expect(filters.year).toBe(2026);
    expect(filters.type).toBe("ANIME");
    expect(filters.sort).toBe("POPULARITY");
  });

  /**
   * Une année hors bornes est ramenée à `null` par le parseur, et **elle seule**. Sans ce
   * bornage, `searchFormSchema` rejetterait l'entrée entière et le repli de `SearchResults`
   * effacerait aussi le type et le genre saisis à côté.
   */
  it("écarte une année absurde sans emporter les autres filtres", async () => {
    const filters = await loadSearchFilters({ year: "0", type: "ANIME" });

    expect(filters.year).toBeNull();
    expect(filters.type).toBe("ANIME");
  });
});
