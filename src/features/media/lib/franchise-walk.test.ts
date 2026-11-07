import { describe, expect, it, vi } from "vitest";
import {
  type FetchLevel,
  type FranchiseEdge,
  walkFranchise,
} from "@/features/media/lib/franchise-walk";
import type { MediaCompact } from "@/features/media/schemas/media.schema";

function media(id: number): MediaCompact {
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
    seasonYear: null,
    genres: [],
    countryOfOrigin: null,
    description: null,
  };
}

const edge = (relationType: string, id: number): FranchiseEdge => ({
  relationType,
  node: media(id),
});

/** Un AniList simulé : les relations de chaque œuvre, et le relevé des lots demandés. */
function fakeAniList(relations: Record<number, FranchiseEdge[]>) {
  return vi.fn<FetchLevel>(
    async (ids) => new Map(ids.map((id) => [id, relations[id] ?? []])),
  );
}

const sortedIds = (map: Map<number, unknown>) =>
  [...map.keys()].sort((a, b) => a - b);

describe("walkFranchise", () => {
  it("suit préquelles et suites dans les deux sens, un lot par niveau", async () => {
    const fetchLevel = fakeAniList({
      1: [edge("SEQUEL", 2)],
      3: [edge("PREQUEL", 2), edge("SEQUEL", 4)],
      4: [edge("PREQUEL", 3)],
    });
    const walk = await walkFranchise(
      media(2),
      [edge("PREQUEL", 1), edge("SEQUEL", 3)],
      fetchLevel,
    );
    expect(sortedIds(walk.graph.media)).toEqual([1, 2, 3, 4]);
    expect(fetchLevel.mock.calls.map(([ids]) => ids)).toEqual([[1, 3], [4]]);
    expect(walk).toMatchObject({
      requests: 2,
      truncated: false,
      incomplete: false,
    });
  });

  it("collecte les parallèles sans les explorer, et ignore les autres liens", async () => {
    const fetchLevel = fakeAniList({});
    const walk = await walkFranchise(
      media(1),
      [edge("SIDE_STORY", 9), edge("SPIN_OFF", 8), edge("ADAPTATION", 7)],
      fetchLevel,
    );
    expect(walk.graph.sides).toEqual([[1, 9]]);
    expect(sortedIds(walk.graph.media)).toEqual([1, 9]);
    expect(fetchLevel).not.toHaveBeenCalled();
  });

  it("ne revisite pas une œuvre déjà vue", async () => {
    const fetchLevel = fakeAniList({
      2: [edge("PREQUEL", 1), edge("SEQUEL", 1)],
    });
    await walkFranchise(media(1), [edge("SEQUEL", 2)], fetchLevel);
    expect(fetchLevel).toHaveBeenCalledTimes(1);
  });

  it("découpe un niveau en lots", async () => {
    const fetchLevel = fakeAniList({});
    const walk = await walkFranchise(
      media(0),
      [1, 2, 3, 4, 5].map((id) => edge("SEQUEL", id)),
      fetchLevel,
      { requests: 6, media: 80, batch: 2 },
    );
    expect(fetchLevel.mock.calls.map(([ids]) => ids)).toEqual([
      [1, 2],
      [3, 4],
      [5],
    ]);
    expect(walk.requests).toBe(3);
  });

  it("s'arrête au plafond de requêtes et le dit", async () => {
    const chain: Record<number, FranchiseEdge[]> = {};
    for (let id = 1; id < 20; id++) chain[id] = [edge("SEQUEL", id + 1)];
    const walk = await walkFranchise(
      media(0),
      [edge("SEQUEL", 1)],
      fakeAniList(chain),
      { requests: 3, media: 80, batch: 50 },
    );
    expect(walk).toMatchObject({
      requests: 3,
      truncated: true,
      incomplete: false,
    });
  });

  it("rend ce qu'il a quand AniList ne répond plus", async () => {
    const fetchLevel = vi.fn<FetchLevel>(async () => null);
    const walk = await walkFranchise(media(1), [edge("SEQUEL", 2)], fetchLevel);
    expect(sortedIds(walk.graph.media)).toEqual([1, 2]);
    expect(walk).toMatchObject({ incomplete: true, truncated: false });
  });
});
