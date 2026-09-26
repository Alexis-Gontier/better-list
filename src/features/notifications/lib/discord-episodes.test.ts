import { describe, expect, it } from "vitest";

import {
  chunkEmbeds,
  episodeEmbed,
  newEpisodes,
  webhookHint,
} from "@/features/notifications/lib/discord-episodes";
import { discordWebhookUrlSchema } from "@/features/notifications/schemas/discord.schema";

const NOW = new Date("2026-09-26T20:00:00Z");
const nowSeconds = NOW.getTime() / 1000;
const HOUR = 3600;

const frieren = {
  mediaId: 1,
  title: "Frieren",
  progress: 4,
};

describe("newEpisodes", () => {
  it("annonce un épisode sorti depuis la dernière passe", () => {
    const items = newEpisodes({
      schedules: [{ mediaId: 1, episode: 5, airingAt: nowSeconds - HOUR / 2 }],
      watched: [frieren],
      since: nowSeconds - HOUR,
      now: NOW,
    });

    expect(items).toEqual([
      expect.objectContaining({ mediaId: 1, episode: 5, lag: 1 }),
    ]);
  });

  it("n'annonce pas deux fois ce qui est à la ligne de flottaison ou avant", () => {
    const items = newEpisodes({
      schedules: [{ mediaId: 1, episode: 5, airingAt: nowSeconds - HOUR }],
      watched: [frieren],
      since: nowSeconds - HOUR,
      now: NOW,
    });

    expect(items).toEqual([]);
  });

  it("n'annonce pas un épisode pas encore diffusé", () => {
    const items = newEpisodes({
      schedules: [{ mediaId: 1, episode: 5, airingAt: nowSeconds + 60 }],
      watched: [frieren],
      since: nowSeconds - HOUR,
      now: NOW,
    });

    expect(items).toEqual([]);
  });

  it("n'annonce pas un épisode déjà vu", () => {
    const items = newEpisodes({
      schedules: [{ mediaId: 1, episode: 4, airingAt: nowSeconds - 60 }],
      watched: [frieren],
      since: nowSeconds - HOUR,
      now: NOW,
    });

    expect(items).toEqual([]);
  });

  it("ignore ce que je ne suis pas, et range du plus ancien au plus récent", () => {
    const items = newEpisodes({
      schedules: [
        { mediaId: 1, episode: 6, airingAt: nowSeconds - 60 },
        { mediaId: 2, episode: 1, airingAt: nowSeconds - 120 },
        { mediaId: 1, episode: 5, airingAt: nowSeconds - 600 },
      ],
      watched: [frieren],
      since: nowSeconds - HOUR,
      now: NOW,
    });

    expect(items.map((item) => [item.episode, item.lag])).toEqual([
      [5, 1],
      [6, 2],
    ]);
  });
});

describe("episodeEmbed", () => {
  it("nomme l'épisode, dit le retard, mène à la fiche et porte la carte", () => {
    const embed = episodeEmbed(
      { ...frieren, episode: 6, airingAt: nowSeconds, lag: 2 },
      {
        media: "https://app.test/media/1",
        card: "https://app.test/api/og/episode/1/6?lang=ROMAJI&sig=x",
      },
    );

    expect(embed).toEqual({
      title: "Frieren — épisode 6",
      url: "https://app.test/media/1",
      description: "2 épisodes de retard",
      timestamp: NOW.toISOString(),
      image: { url: "https://app.test/api/og/episode/1/6?lang=ROMAJI&sig=x" },
    });
  });
});

describe("chunkEmbeds", () => {
  it("coupe par dix", () => {
    const embed = { title: "x", url: "https://app.test" };
    const chunks = chunkEmbeds(Array.from({ length: 23 }, () => embed));

    expect(chunks.map((chunk) => chunk.length)).toEqual([10, 10, 3]);
  });
});

describe("webhookHint", () => {
  it("ne laisse voir que la fin de l'id, jamais le jeton", () => {
    const hint = webhookHint(
      "https://discord.com/api/webhooks/123456789012345678/secret-token_ABC",
    );

    expect(hint).toBe("webhook …5678");
    expect(hint).not.toContain("secret");
  });
});

describe("discordWebhookUrlSchema", () => {
  it.each([
    "https://discord.com/api/webhooks/123/abc-DEF_1",
    "https://discordapp.com/api/webhooks/123/abc",
    "https://canary.discord.com/api/v10/webhooks/123/abc",
    "  https://ptb.discord.com/api/webhooks/123/abc  ",
  ])("accepte %s", (url) => {
    expect(discordWebhookUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "http://discord.com/api/webhooks/123/abc",
    "https://discord.com.evil.test/api/webhooks/123/abc",
    "https://evil.test/?https://discord.com/api/webhooks/123/abc",
    "https://discord.com/api/webhooks/abc/abc",
    "https://discord.com/api/webhooks/123/",
    "https://discord.com/api/webhooks/123/abc/../../users",
  ])("refuse %s", (url) => {
    expect(discordWebhookUrlSchema.safeParse(url).success).toBe(false);
  });
});
