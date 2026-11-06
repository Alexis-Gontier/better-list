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

describe("readyNotifiedAtFor", () => {
  const now = new Date("2026-11-06T10:00:00Z");

  it("marque annoncée une œuvre terminée, pas une œuvre en cours", () => {
    expect(readyNotifiedAtFor("FINISHED", now)).toBe(now);
    expect(readyNotifiedAtFor("RELEASING", now)).toBeNull();
    expect(readyNotifiedAtFor(null, now)).toBeNull();
  });
});
