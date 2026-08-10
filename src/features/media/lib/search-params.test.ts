import { describe, expect, it } from "vitest";

import {
  EMPTY_QUERY_SORT,
  resolveSort,
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
