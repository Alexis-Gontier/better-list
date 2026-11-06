import { describe, expect, it } from "vitest";

import { forkData, readyNotifiedAtFor } from "@/features/lists/lib/list-fork";

const source = {
  id: "orig",
  title: "Best of isekai",
  description: "Les incontournables",
  kind: "RANKING" as const,
  cutoff: 10,
  items: [
    { mediaId: 1, rank: "a0", note: "à revoir", readyNotifiedAt: new Date() },
    { mediaId: 2, rank: "a1", note: null, readyNotifiedAt: null },
  ],
};

describe("forkData", () => {
  it("recopie titre, description, genre, coupe et rangs, en privé", () => {
    const { list, items } = forkData(source, "moi");

    expect(list).toEqual({
      ownerId: "moi",
      title: "Best of isekai",
      description: "Les incontournables",
      kind: "RANKING",
      cutoff: 10,
      visibility: "PRIVATE",
      forkedFromId: "orig",
    });
    expect(items).toEqual([
      { mediaId: 1, rank: "a0" },
      { mediaId: 2, rank: "a1" },
    ]);
  });

  it("ne recopie ni les notes ni l'horodatage d'annonce", () => {
    for (const item of forkData(source, "moi").items) {
      expect(item).not.toHaveProperty("note");
      expect(item).not.toHaveProperty("readyNotifiedAt");
    }
  });
});

describe("forkData d'une tier list", () => {
  const tierSource = {
    id: "tl",
    title: "Isekai, la tier list",
    description: null,
    kind: "TIER" as const,
    cutoff: null,
    tiers: [
      { label: "S", color: "#FF7F7F" },
      { label: "A", color: "#FFBF7F" },
    ],
    items: [
      { mediaId: 1, rank: "a0", tierIndex: 0 },
      { mediaId: 2, rank: "a1", tierIndex: null },
    ],
  };

  it("copie avec son classement : paliers et placements compris", () => {
    const { list, items } = forkData(tierSource, "moi", "copy");

    expect(list).toMatchObject({ forkedFromId: "tl", tiers: tierSource.tiers });
    expect(list).not.toHaveProperty("versionOfId");
    expect(items.map((i) => i.tierIndex)).toEqual([0, null]);
  });

  it("fait ma version : mêmes œuvres et paliers, tout dans la réserve, liée à l'original", () => {
    const { list, items } = forkData(tierSource, "moi", "version");

    expect(list).toMatchObject({
      versionOfId: "tl",
      tiers: tierSource.tiers,
      visibility: "PRIVATE",
    });
    expect(list).not.toHaveProperty("forkedFromId");
    expect(items).toEqual([
      { mediaId: 1, rank: "a0", tierIndex: null },
      { mediaId: 2, rank: "a1", tierIndex: null },
    ]);
  });
});

describe("readyNotifiedAtFor", () => {
  const now = new Date("2026-11-06T10:00:00Z");

  it("marque annoncée une œuvre terminée, pas une œuvre en cours", () => {
    expect(readyNotifiedAtFor("FINISHED", now)).toBe(now);
    expect(readyNotifiedAtFor("RELEASING", now)).toBeNull();
    expect(readyNotifiedAtFor(null, now)).toBeNull();
  });
});
