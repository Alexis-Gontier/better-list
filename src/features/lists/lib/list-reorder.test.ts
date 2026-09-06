import { describe, expect, it } from "vitest";

import {
  type RankedItem,
  rankAfterMove,
  rankForAppend,
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

/**
 * `rankForAppend` — le rang d'une œuvre ajoutée **en fin de liste**.
 *
 * C'est le pendant d'ajout de `rankAfterMove`, et il ne reçoit que le dernier rang : l'action lit
 * une ligne (`orderBy: { rank: "desc" }, take: 1`) au lieu de rapatrier la liste entière pour en
 * regarder la fin.
 */
describe("rankForAppend", () => {
  it("donne un rang à la première œuvre d'une liste vide", () => {
    expect(rankForAppend(null)).toBeTypeOf("string");
    expect(rankForAppend(null).length).toBeGreaterThan(0);
  });

  it("place la nouvelle œuvre après la dernière", () => {
    const dernier = ITEMS.at(-1)?.rank ?? null;
    expect(rankForAppend(dernier) > (dernier as string)).toBe(true);
  });

  /*
    L'assertion qui compte vraiment : **l'ordre d'insertion doit être l'ordre `rank` croissant**,
    puisque c'est `orderBy: { rank: "asc" }` qui rendra la liste. Une clé qui trierait mal ne se
    verrait qu'au quatrième ajout, en base, chez Alexis.
  */
  it("garde une suite strictement croissante sur des ajouts successifs", () => {
    const rangs: string[] = [];
    for (let i = 0; i < 5; i++) rangs.push(rankForAppend(rangs.at(-1) ?? null));

    expect([...rangs].sort()).toEqual(rangs);
    expect(new Set(rangs).size).toBe(rangs.length);
  });

  it("reprend la suite après un rang existant sans toucher aux précédents", () => {
    const ajoute = rankForAppend("a3");
    const ordre = [...ITEMS.map((item) => item.rank), ajoute];

    expect([...ordre].sort()).toEqual(ordre);
  });
});
