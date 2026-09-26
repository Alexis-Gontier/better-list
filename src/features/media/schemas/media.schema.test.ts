import { describe, expect, it } from "vitest";

import { mediaStatsSchema } from "@/features/media/schemas/media.schema";

describe("mediaStatsSchema", () => {
  it("lit comme vides les distributions qu'AniList rend à null", () => {
    // Forme relevée le 26 septembre 2026 sur les ids 217330 et 217331 : deux saisons annoncées de
    // Tensei Shitara Slime Datta Ken, que personne n'a encore notées ni suivies.
    const stats = mediaStatsSchema.parse({
      scoreDistribution: null,
      statusDistribution: null,
    });

    expect(stats).toEqual({ scoreDistribution: [], statusDistribution: [] });
  });

  it("garde les distributions présentes, trous compris", () => {
    const stats = mediaStatsSchema.parse({
      scoreDistribution: [{ score: 10, amount: 3 }, null],
      statusDistribution: [{ status: "CURRENT", amount: 5 }],
    });

    expect(stats.scoreDistribution).toEqual([{ score: 10, amount: 3 }, null]);
    expect(stats.statusDistribution).toEqual([
      { status: "CURRENT", amount: 5 },
    ]);
  });
});
