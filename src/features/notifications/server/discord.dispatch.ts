import "server-only";

import { env } from "@/config/env";
import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import { getAiringSchedule } from "@/features/media/server/media.queries";
import {
  chunkEmbeds,
  episodeEmbed,
  newEpisodes,
} from "@/features/notifications/lib/discord-episodes";
import {
  isGoneWebhook,
  postToWebhook,
} from "@/features/notifications/server/discord-webhook";
import { signEpisodeCard } from "@/features/notifications/server/episode-card-signature";
import { AIRING_ENTRY_STATUSES } from "@/features/tracking/server/library.queries";
import { prisma } from "@/lib/db/prisma";

/**
 * **Jamais plus d'une semaine en arrière**, même pour un webhook resté muet — AniList en panne
 * trois jours, un workflow GitHub désactivé. Au-delà, un salon recevrait d'un coup un mois de
 * diffusions, ce qui n'est plus une notification mais un arriéré ; et la fenêtre demandée à
 * AniList s'allongerait d'autant, pages comprises.
 */
const MAX_CATCH_UP_SECONDS = 7 * 24 * 3600;

export type DiscordDispatchSummary = {
  webhooks: number;
  /** Webhooks qui ont reçu au moins un message. */
  notified: number;
  episodes: number;
  /** Webhooks supprimés côté Discord, donc débranchés ici. */
  removed: number;
  /** Envois ratés pour une autre raison — retentés à la passe suivante. */
  failed: number;
  anilistUnavailable: boolean;
};

/**
 * Pousser dans Discord ce qui est sorti depuis la dernière passe, **pour tous les comptes
 * branchés à la fois**.
 *
 * **Une seule lecture AniList pour tout le cercle.** Les ids suivis sont réunis, et la fenêtre part
 * de la ligne de flottaison la plus ancienne : quatre comptes, une requête par passe — la même
 * économie que la cloche, qui tombe dans le cache de l'accueil.
 *
 * **La ligne de flottaison ne monte que sur un envoi réussi.** Discord en panne, un 429 : le compte
 * garde sa ligne, et la passe suivante renvoie la même chose. Pas de doublon possible dans l'autre
 * sens — une ligne montée est une ligne livrée.
 *
 * AniList muet : rien ne bouge, pour personne. Remonter les lignes sans avoir su ce qui était sorti
 * perdrait les épisodes de l'heure.
 */
export async function dispatchDiscordEpisodes(
  now: Date = new Date(),
): Promise<DiscordDispatchSummary> {
  const summary: DiscordDispatchSummary = {
    webhooks: 0,
    notified: 0,
    episodes: 0,
    removed: 0,
    failed: 0,
    anilistUnavailable: false,
  };

  const webhooks = await prisma.discordWebhook.findMany({
    // Un compte suspendu garde sa ligne mais ne reçoit plus rien : la garde de `(app)` vaut ici aussi.
    where: { user: { status: "APPROVED" } },
    select: {
      userId: true,
      url: true,
      notifiedUntil: true,
      user: {
        select: {
          preferences: { select: { titleLanguage: true, includeAdult: true } },
        },
      },
    },
  });

  summary.webhooks = webhooks.length;
  if (webhooks.length === 0) return summary;

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const floor = nowSeconds - MAX_CATCH_UP_SECONDS;
  const sinceOf = (webhook: (typeof webhooks)[number]) =>
    Math.max(floor, Math.floor(webhook.notifiedUntil.getTime() / 1000));

  const entries = await prisma.entry.findMany({
    where: {
      userId: { in: webhooks.map((webhook) => webhook.userId) },
      status: { in: AIRING_ENTRY_STATUSES },
      media: { type: "ANIME" },
    },
    select: {
      userId: true,
      progress: true,
      media: {
        select: {
          id: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          isAdult: true,
        },
      },
    },
  });

  const schedule = await getAiringSchedule({
    mediaIds: [...new Set(entries.map((entry) => entry.media.id))],
    from: Math.min(...webhooks.map(sinceOf)),
    // La borne haute d'AniList est stricte : `+ 1` pour garder ce qui passe à la seconde près.
    to: nowSeconds + 1,
  });

  if (!schedule) {
    summary.anilistUnavailable = true;
    return summary;
  }

  for (const webhook of webhooks) {
    const titleLanguage = webhook.user.preferences?.titleLanguage ?? "ROMAJI";
    const includeAdult = webhook.user.preferences?.includeAdult ?? false;

    const items = newEpisodes({
      schedules: schedule.schedules,
      watched: entries
        .filter(
          (entry) =>
            entry.userId === webhook.userId &&
            // Le filtre 18+ du compte vaut aussi pour son salon.
            (includeAdult || !entry.media.isAdult),
        )
        .map((entry) => ({
          mediaId: entry.media.id,
          title: mediaTitle(
            {
              romaji: entry.media.titleRomaji,
              english: entry.media.titleEnglish,
              native: entry.media.titleNative,
              userPreferred: null,
            },
            titleLanguage,
          ),
          progress: entry.progress,
        })),
      since: sinceOf(webhook),
      now,
    });

    try {
      // Le titre de la carte suit la langue du compte, sauf l'écriture d'origine, que la police
      // de `next/og` ne dessine pas : le romaji la remplace.
      const cardLang = titleLanguage === "ENGLISH" ? "ENGLISH" : "ROMAJI";
      const absolute = (path: string) =>
        new URL(path, env.NEXT_PUBLIC_APP_URL).href;

      const embeds = items.map((item) => {
        const card = {
          mediaId: item.mediaId,
          episode: item.episode,
          lang: cardLang,
        } as const;

        return episodeEmbed(item, {
          media: absolute(routes.media(item.mediaId)),
          card: absolute(
            routes.api.episodeCard({ ...card, sig: signEpisodeCard(card) }),
          ),
        });
      });

      for (const chunk of chunkEmbeds(embeds))
        await postToWebhook(webhook.url, { embeds: chunk });

      await prisma.discordWebhook.update({
        where: { userId: webhook.userId },
        data: { notifiedUntil: now },
      });

      if (items.length > 0) {
        summary.notified += 1;
        summary.episodes += items.length;
      }
    } catch (error) {
      if (isGoneWebhook(error)) {
        await prisma.discordWebhook.delete({
          where: { userId: webhook.userId },
        });
        summary.removed += 1;
      } else {
        console.error("[discord]", webhook.userId, error);
        summary.failed += 1;
      }
    }
  }

  return summary;
}
