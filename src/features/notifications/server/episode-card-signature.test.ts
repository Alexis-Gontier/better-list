import { describe, expect, it } from "vitest";

import {
  isValidEpisodeCardSignature,
  signEpisodeCard,
} from "@/features/notifications/server/episode-card-signature";

const card = { mediaId: 1, episode: 6, lang: "ROMAJI" } as const;

describe("signature des cartes d'épisode", () => {
  it("accepte la signature émise", () => {
    expect(isValidEpisodeCardSignature(card, signEpisodeCard(card))).toBe(true);
  });

  it.each([
    { ...card, episode: 7 },
    { ...card, mediaId: 2 },
    { ...card, lang: "ENGLISH" as const },
  ])("la refuse pour une autre carte (%o)", (other) => {
    expect(isValidEpisodeCardSignature(other, signEpisodeCard(card))).toBe(
      false,
    );
  });

  it("refuse une signature absente ou tronquée", () => {
    expect(isValidEpisodeCardSignature(card, "")).toBe(false);
    expect(
      isValidEpisodeCardSignature(card, signEpisodeCard(card).slice(0, 8)),
    ).toBe(false);
  });
});
