import { describe, expect, it } from "vitest";
import { communityStats } from "@/app/(app)/media/[id]/_lib/media-community";
import type { MediaRanking } from "@/features/media/schemas/media.schema";

function ranking(overrides: Partial<MediaRanking>): MediaRanking {
  return {
    rank: 10,
    type: "RATED",
    format: "TV",
    year: null,
    season: null,
    allTime: false,
    context: "",
    ...overrides,
  };
}

describe("communityStats", () => {
  it("convertit les paliers sur 100 en étoiles et retire les trous", () => {
    const stats = communityStats({
      stats: {
        scoreDistribution: [
          { score: 10, amount: 3 },
          null,
          { score: 100, amount: 40 },
        ],
        statusDistribution: [],
      },
      rankings: [],
    });
    expect(stats?.scores).toEqual([
      { stars: 0.5, count: 3 },
      { stars: 5, count: 40 },
    ]);
  });

  it("trie les statuts par effectif décroissant", () => {
    const stats = communityStats({
      stats: {
        scoreDistribution: [],
        statusDistribution: [
          { status: "CURRENT", amount: 10 },
          null,
          { status: "COMPLETED", amount: 50 },
        ],
      },
      rankings: [],
    });
    expect(stats?.statuses.map((s) => s.status)).toEqual([
      "COMPLETED",
      "CURRENT",
    ]);
  });

  it("garde les trois meilleurs classements, « tous les temps » d'abord à rang égal", () => {
    const stats = communityStats({
      stats: null,
      rankings: [
        ranking({ rank: 50 }),
        ranking({ rank: 3, allTime: false, year: 2017 }),
        ranking({ rank: 3, allTime: true }),
        ranking({ rank: 8, type: "POPULAR" }),
      ],
    });
    expect(stats?.rankings.map((r) => [r.rank, r.allTime])).toEqual([
      [3, true],
      [3, false],
      [8, false],
    ]);
  });

  it("rend null quand il n'y a rien à montrer", () => {
    expect(communityStats({ stats: null, rankings: [] })).toBeNull();
    expect(
      communityStats({
        stats: { scoreDistribution: [], statusDistribution: [] },
        rankings: [],
      }),
    ).toBeNull();
  });
});
