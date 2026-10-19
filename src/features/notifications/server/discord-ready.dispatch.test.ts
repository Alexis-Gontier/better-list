import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Le **cycle d'une annonce** : on envoie, puis on marque — et seulement dans cet ordre.
 *
 * Prisma et Discord sont doublés : ce qui peut se tromper ici, c'est l'ordre des écritures (un
 * marquage avant l'envoi perdrait l'annonce, un envoi sans marquage la répéterait toutes les heures)
 * et le sort d'un webhook supprimé côté Discord. La forme du message est testée à part
 * (`discord-ready.test.ts`).
 */

const db = vi.hoisted(() => ({
  webhooks: vi.fn(),
  items: vi.fn(),
  entries: vi.fn(),
  mark: vi.fn(),
  deleteWebhook: vi.fn(),
  post: vi.fn(),
  gone: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    discordWebhook: { findMany: db.webhooks, delete: db.deleteWebhook },
    listItem: { findMany: db.items, updateMany: db.mark },
    entry: { findMany: db.entries },
  },
}));
vi.mock("@/features/notifications/server/discord-webhook", () => ({
  postToWebhook: db.post,
  isGoneWebhook: db.gone,
}));
vi.mock("@/config/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "https://better-list.example" },
}));

import { dispatchDiscordReadyWorks } from "@/features/notifications/server/discord-ready.dispatch";

const WEBHOOK = {
  userId: "u1",
  url: "https://discord.com/api/webhooks/1/x",
  user: { preferences: { titleLanguage: "ROMAJI", includeAdult: false } },
};

function readyItem(id: string, mediaId: number) {
  return {
    id,
    list: { ownerId: "u1", title: "A lire une fois fini" },
    media: {
      id: mediaId,
      status: "FINISHED",
      coverImage: null,
      isAdult: false,
      titleRomaji: `Œuvre ${mediaId}`,
      titleEnglish: null,
      titleNative: null,
    },
  };
}

beforeEach(() => {
  for (const mock of Object.values(db)) mock.mockReset();
  db.webhooks.mockResolvedValue([WEBHOOK]);
  db.items.mockResolvedValue([readyItem("i1", 1), readyItem("i2", 2)]);
  db.entries.mockResolvedValue([]);
  db.post.mockResolvedValue({ id: "m1" });
  db.gone.mockReturnValue(false);
});

describe("dispatchDiscordReadyWorks", () => {
  it("annonce les œuvres prêtes, puis les marque", async () => {
    const summary = await dispatchDiscordReadyWorks();

    expect(db.post).toHaveBeenCalledTimes(1);
    expect(db.post.mock.calls[0]?.[1].embeds).toHaveLength(2);
    expect(db.mark).toHaveBeenCalledWith({
      where: { id: { in: ["i1", "i2"] } },
      data: { readyNotifiedAt: expect.any(Date) },
    });
    // Le marquage vient après l'envoi : l'inverse perdrait l'annonce si Discord échouait.
    expect(db.post.mock.invocationCallOrder[0]).toBeLessThan(
      db.mark.mock.invocationCallOrder[0] ?? 0,
    );
    expect(summary).toMatchObject({ notified: 1, works: 2, failed: 0 });
  });

  it("ne marque rien quand Discord échoue, pour réessayer à la passe suivante", async () => {
    db.post.mockRejectedValue(new Error("500"));

    const summary = await dispatchDiscordReadyWorks();

    expect(db.mark).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ notified: 0, failed: 1 });
  });

  it("débranche un webhook supprimé côté Discord", async () => {
    db.post.mockRejectedValue(new Error("404"));
    db.gone.mockReturnValue(true);

    const summary = await dispatchDiscordReadyWorks();

    expect(db.deleteWebhook).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(summary.removed).toBe(1);
  });

  it("marque sans rien envoyer une œuvre que le compte a déjà terminée", async () => {
    db.items.mockResolvedValue([readyItem("i1", 1)]);
    db.entries.mockResolvedValue([{ userId: "u1", mediaId: 1 }]);

    await dispatchDiscordReadyWorks();

    expect(db.post).not.toHaveBeenCalled();
    expect(db.mark).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["i1"] } } }),
    );
  });

  it("ne lit rien quand personne n'a branché de webhook", async () => {
    db.webhooks.mockResolvedValue([]);

    await dispatchDiscordReadyWorks();

    expect(db.items).not.toHaveBeenCalled();
  });
});
