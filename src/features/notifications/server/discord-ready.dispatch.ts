import "server-only";

import { env } from "@/config/env";
import { routes } from "@/config/routes";
import { READY_MEDIA_STATUSES } from "@/features/lists/lib/list-sections";
import { mediaTitle } from "@/features/media/lib/media-format";
import { chunkEmbeds } from "@/features/notifications/lib/discord-episodes";
import {
  readyAnnouncements,
  readyEmbed,
} from "@/features/notifications/lib/discord-ready";
import {
  isGoneWebhook,
  postToWebhook,
} from "@/features/notifications/server/discord-webhook";
import { prisma } from "@/lib/db/prisma";

export type DiscordReadySummary = {
  webhooks: number;
  /** Webhooks qui ont reçu au moins une annonce. */
  notified: number;
  works: number;
  removed: number;
  /** Envois ratés pour une autre raison — retentés à la passe suivante, rien n'est marqué. */
  failed: number;
};

/**
 * Annoncer dans Discord les œuvres de mes listes « Quand c'est fini » **qui viennent d'être
 * prêtes** (D50), pour tous les comptes branchés à la fois.
 *
 * **Aucune lecture AniList** : c'est le miroir qui sait qu'une parution s'est achevée, rafraîchi
 * chaque nuit par le cron `refresh-media`. L'annonce part donc à la première passe horaire qui suit.
 *
 * **Une œuvre est marquée seulement si l'envoi a réussi** — la règle de la ligne de flottaison des
 * épisodes. Discord en panne : rien ne bouge, la passe suivante renvoie la même chose.
 */
export async function dispatchDiscordReadyWorks(): Promise<DiscordReadySummary> {
  const summary: DiscordReadySummary = {
    webhooks: 0,
    notified: 0,
    works: 0,
    removed: 0,
    failed: 0,
  };

  const webhooks = await prisma.discordWebhook.findMany({
    // Un compte suspendu ne reçoit plus rien : la garde de `(app)` vaut ici aussi.
    where: { user: { status: "APPROVED" } },
    select: {
      userId: true,
      url: true,
      user: {
        select: {
          preferences: { select: { titleLanguage: true, includeAdult: true } },
        },
      },
    },
  });

  summary.webhooks = webhooks.length;
  if (webhooks.length === 0) return summary;

  const items = await prisma.listItem.findMany({
    where: {
      readyNotifiedAt: null,
      list: {
        kind: "WAIT_FOR_END",
        ownerId: { in: webhooks.map((webhook) => webhook.userId) },
      },
      media: { status: { in: [...READY_MEDIA_STATUSES] } },
    },
    select: {
      id: true,
      list: { select: { ownerId: true, title: true } },
      media: {
        select: {
          id: true,
          status: true,
          coverImage: true,
          isAdult: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
        },
      },
    },
  });
  if (items.length === 0) return summary;

  // Une œuvre déjà terminée par son lecteur n'est plus une nouvelle.
  const completed = await prisma.entry.findMany({
    where: {
      status: "COMPLETED",
      userId: { in: webhooks.map((webhook) => webhook.userId) },
      mediaId: { in: [...new Set(items.map((item) => item.media.id))] },
    },
    select: { userId: true, mediaId: true },
  });
  const seen = new Set(completed.map((e) => `${e.userId}:${e.mediaId}`));

  for (const webhook of webhooks) {
    const titleLanguage = webhook.user.preferences?.titleLanguage ?? "ROMAJI";
    const includeAdult = webhook.user.preferences?.includeAdult ?? false;

    const { announcements, settledItemIds } = readyAnnouncements(
      items
        .filter((item) => item.list.ownerId === webhook.userId)
        .map((item) => ({
          itemId: item.id,
          mediaId: item.media.id,
          title: mediaTitle(
            {
              romaji: item.media.titleRomaji,
              english: item.media.titleEnglish,
              native: item.media.titleNative,
              userPreferred: null,
            },
            titleLanguage,
          ),
          status: item.media.status ?? "FINISHED",
          cover: item.media.coverImage,
          isAdult: item.media.isAdult,
          listTitle: item.list.title,
          seen: seen.has(`${webhook.userId}:${item.media.id}`),
        })),
      { includeAdult },
    );
    if (settledItemIds.length === 0) continue;

    try {
      const embeds = announcements.map((announcement) =>
        readyEmbed(announcement, {
          media: new URL(
            routes.media(announcement.mediaId),
            env.NEXT_PUBLIC_APP_URL,
          ).href,
        }),
      );
      for (const chunk of chunkEmbeds(embeds))
        await postToWebhook(webhook.url, { embeds: chunk });

      await prisma.listItem.updateMany({
        where: { id: { in: settledItemIds } },
        data: { readyNotifiedAt: new Date() },
      });

      if (announcements.length > 0) {
        summary.notified += 1;
        summary.works += announcements.length;
      }
    } catch (error) {
      if (isGoneWebhook(error)) {
        await prisma.discordWebhook.delete({
          where: { userId: webhook.userId },
        });
        summary.removed += 1;
      } else {
        console.error("[discord:ready]", webhook.userId, error);
        summary.failed += 1;
      }
    }
  }

  return summary;
}
