import { describe, expect, it } from "vitest";

import {
  type RankedItem,
  rankAfterMove,
} from "@/features/lists/lib/list-reorder";

/**
 * Quatre œuvres, aux rangs qu'aurait produits une suite d'ajouts en fin de liste
 * (`generateKeyBetween(dernier, null)`).
 */
const ITEMS: RankedItem[] = [
  { id: "a", rank: "a0" },
  { id: "b", rank: "a1" },
  { id: "c", rank: "a2" },
  { id: "d", rank: "a3" },
];

/**
 * L'ordre obtenu si on applique le rang calculé. C'est la seule assertion qui ait du sens : la valeur
 * exacte de la clé est un détail de `fractional-indexing`, la place qu'elle donne ne l'est pas.
 */
function orderAfterMove(movedId: string, toIndex: number): string[] {
  const rank = rankAfterMove(ITEMS, movedId, toIndex);
  if (rank === null) return ITEMS.map((item) => item.id);

  return ITEMS.map((item) => (item.id === movedId ? { ...item, rank } : item))
    .sort((left, right) => (left.rank < right.rank ? -1 : 1))
    .map((item) => item.id);
}

describe("rankAfterMove", () => {
  it("déplace vers le haut", () => {
    expect(orderAfterMove("d", 1)).toEqual(["a", "d", "b", "c"]);
    expect(orderAfterMove("c", 0)).toEqual(["c", "a", "b", "d"]);
  });

  /**
   * Le cas qui décale d'une case quand on oublie de retirer l'élément déplacé avant de chercher ses
   * voisins. « a » vers l'index 2 doit finir **après** « c », pas avant.
   */
  it("déplace vers le bas sans se décaler d'une case", () => {
    expect(orderAfterMove("a", 2)).toEqual(["b", "c", "a", "d"]);
    expect(orderAfterMove("b", 3)).toEqual(["a", "c", "d", "b"]);
  });

  it("place en tête et en queue", () => {
    expect(orderAfterMove("d", 0)).toEqual(["d", "a", "b", "c"]);
    expect(orderAfterMove("a", 3)).toEqual(["b", "c", "d", "a"]);
  });

  /** Rien à écrire : l'action s'en sert pour ne pas toucher la base ni remonter la liste. */
  it("ne renvoie rien quand la place ne change pas", () => {
    expect(rankAfterMove(ITEMS, "b", 1)).toBeNull();
  });

  it("ne renvoie rien pour un élément absent de la liste", () => {
    expect(rankAfterMove(ITEMS, "inconnu", 0)).toBeNull();
  });

  /** Une position forgée est ramenée dans les bornes, pas refusée. */
  it("borne une position hors de la liste", () => {
    expect(orderAfterMove("a", 99)).toEqual(["b", "c", "d", "a"]);
    expect(orderAfterMove("d", -5)).toEqual(["d", "a", "b", "c"]);
  });

  /**
   * L'invariant qui justifie l'index fractionnaire : la clé calculée tient **strictement entre** ses
   * deux voisins, donc aucune autre ligne n'a besoin d'être réécrite.
   */
  it("produit une clé strictement comprise entre les deux voisins", () => {
    const rank = rankAfterMove(ITEMS, "d", 1);

    expect(rank).not.toBeNull();
    expect(rank && rank > "a0").toBe(true);
    expect(rank && rank < "a1").toBe(true);
  });

  it("gère une liste d'un seul élément", () => {
    expect(rankAfterMove([{ id: "a", rank: "a0" }], "a", 0)).toBeNull();
  });
});
