import { describe, expect, it } from "vitest";

import { highlightMatch } from "@/features/command/lib/highlight-match";

describe("highlightMatch", () => {
  it("marque le terme sans tenir compte de la casse, en gardant la casse du titre", () => {
    expect(highlightMatch("Frieren: Beyond Journey's End", "frieren")).toEqual([
      { text: "Frieren", match: true },
      { text: ": Beyond Journey's End", match: false },
    ]);
  });

  it("marque toutes les occurrences", () => {
    expect(highlightMatch("One Piece: ONE PIECE Film", "one piece")).toEqual([
      { text: "One Piece", match: true },
      { text: ": ", match: false },
      { text: "ONE PIECE", match: true },
      { text: " Film", match: false },
    ]);
  });

  it("rend le titre entier quand le terme n'y est pas", () => {
    expect(highlightMatch("Frieren", "sousou no")).toEqual([
      { text: "Frieren", match: false },
    ]);
  });

  it("rend le titre entier pour un terme vide ou fait d'espaces", () => {
    expect(highlightMatch("Eleceed", "  ")).toEqual([
      { text: "Eleceed", match: false },
    ]);
  });
});
