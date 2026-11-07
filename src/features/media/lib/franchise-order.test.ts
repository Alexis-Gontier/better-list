import { describe, expect, it } from "vitest";
import {
  type FranchiseGraph,
  orderFranchise,
} from "@/features/media/lib/franchise-order";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

function media(id: number, seasonYear: number | null = null): MediaCompact {
  return {
    id,
    type: "ANIME",
    format: "TV",
    status: "FINISHED",
    averageScore: null,
    isAdult: false,
    title: {
      romaji: `M${id}`,
      english: null,
      native: null,
      userPreferred: null,
    },
    coverImage: null,
    episodes: null,
    chapters: null,
    season: null,
    seasonYear,
    genres: [],
    countryOfOrigin: null,
    description: null,
  };
}

function graph(
  currentId: number,
  all: MediaCompact[],
  sequels: Array<[number, number]>,
  sides: Array<[number, number]> = [],
): FranchiseGraph {
  return {
    currentId,
    media: new Map(all.map((m) => [m.id, m])),
    sequels,
    sides,
  };
}

const ids = (g: FranchiseGraph) =>
  orderFranchise(g).map((item) => item.media.id);

describe("orderFranchise", () => {
  it("ordonne une chaîne linéaire, vue depuis le milieu", () => {
    const g = graph(
      2,
      [media(3), media(1), media(2)],
      [
        [2, 3],
        [1, 2],
      ],
    );
    expect(ids(g)).toEqual([1, 2, 3]);
    expect(orderFranchise(g).map((i) => i.position)).toEqual([1, 2, 3]);
    expect(orderFranchise(g).find((i) => i.current)?.media.id).toBe(2);
  });

  it("départage une bifurcation par année, puis par id, l'année nulle en dernier", () => {
    const g = graph(
      1,
      [media(1, 2010), media(4, null), media(3, 2015), media(2, 2012)],
      [
        [1, 4],
        [1, 3],
        [1, 2],
      ],
    );
    expect(ids(g)).toEqual([1, 2, 3, 4]);
  });

  it("ignore les arêtes en double et coupe un cycle sans boucler", () => {
    const g = graph(
      1,
      [media(1, 2010), media(2, 2011), media(3, 2012)],
      [
        [1, 2],
        [1, 2],
        [2, 3],
        [3, 1],
      ],
    );
    expect(ids(g)).toEqual([1, 2, 3]);
  });

  it("place les parallèles après leur maillon, sans numéro", () => {
    const g = graph(
      1,
      [media(1, 2010), media(2, 2012), media(10, 2013), media(11, 2011)],
      [[1, 2]],
      [
        [1, 10],
        [1, 11],
        [2, 10],
      ],
    );
    const items = orderFranchise(g);
    expect(items.map((i) => i.media.id)).toEqual([1, 11, 10, 2]);
    expect(items.map((i) => i.role)).toEqual(["main", "side", "side", "main"]);
    expect(items.map((i) => i.position)).toEqual([1, null, null, 2]);
  });

  it("garde comme maillon une parallèle qui est aussi dans la chaîne", () => {
    const g = graph(1, [media(1), media(2)], [[1, 2]], [[1, 2]]);
    expect(orderFranchise(g).map((i) => i.role)).toEqual(["main", "main"]);
  });

  it("rend l'œuvre seule quand elle n'a aucun lien", () => {
    expect(ids(graph(7, [media(7)], []))).toEqual([7]);
  });
});
