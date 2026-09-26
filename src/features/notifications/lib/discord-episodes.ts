import type { DiscordEmbed } from "@/features/notifications/schemas/discord.schema";
import { formatLag, hasAired } from "@/features/tracking/lib/airing-lag";

/**
 * Ce que le cron pousse dans Discord : **les épisodes diffusés depuis la dernière passe**, sur ce
 * que je regarde, et que je n'ai pas déjà vus.
 *
 * Fonctions pures et testées, comme `airing-lag.ts` dont elles reprennent le vocabulaire : ce qui
 * décide d'envoyer ou non un message à quelqu'un se lit mieux dans un test que dans une boucle
 * entrelacée d'appels réseau.
 */

/** Discord refuse un message qui porte plus de dix embeds. */
export const MAX_EMBEDS_PER_MESSAGE = 10;

type ScheduleSlot = { mediaId: number; episode: number; airingAt: number };

/** Une série que je suis, réduite à ce qu'un message en dit. */
type WatchedAnime = {
  mediaId: number;
  /** Déjà résolu dans la langue du compte. */
  title: string;
  progress: number;
};

export type NewEpisode = WatchedAnime & {
  episode: number;
  airingAt: number;
  /** Combien d'épisodes sortis je n'ai pas vus, celui-ci compris. */
  lag: number;
};

/**
 * Les diffusions à annoncer, **de la plus ancienne à la plus récente** — l'ordre du salon, où le
 * dernier message est en bas.
 *
 * Trois filtres, et chacun a sa raison :
 *
 * - **après `since`** (strictement) : `since` est la ligne de flottaison du compte, tout ce qui est
 *   à ou avant elle a déjà été annoncé ;
 * - **déjà diffusé** : la fenêtre demandée à AniList déborde un peu sur l'avenir, et annoncer un
 *   épisode qui n'est pas sorti serait le seul mensonge possible ici ;
 * - **au-delà de ma progression** : un épisode que j'ai marqué vu entre sa diffusion et la passe
 *   — une avant-première, un « +1 » rapide — n'est pas une nouvelle.
 */
export function newEpisodes({
  schedules,
  watched,
  since,
  now,
}: {
  schedules: ScheduleSlot[];
  watched: WatchedAnime[];
  /** En secondes Unix, l'unité d'AniList. */
  since: number;
  now: Date;
}): NewEpisode[] {
  const byMedia = new Map(watched.map((anime) => [anime.mediaId, anime]));

  return schedules
    .flatMap((slot) => {
      const anime = byMedia.get(slot.mediaId);
      if (!anime) return [];
      if (slot.airingAt <= since || !hasAired(slot.airingAt, now)) return [];
      if (slot.episode <= anime.progress) return [];

      return [
        {
          ...anime,
          episode: slot.episode,
          airingAt: slot.airingAt,
          lag: slot.episode - anime.progress,
        },
      ];
    })
    .sort((first, second) => first.airingAt - second.airingAt);
}

/**
 * Un embed par épisode : le titre mène à la fiche **chez nous**, pas chez AniList — c'est là que se
 * trouve le « +1 » —, et l'image est la carte de l'épisode, en pleine largeur.
 *
 * Les deux URL sont passées par l'appelant plutôt que construites ici : la fonction reste pure, et
 * la seule source des chemins reste `config/routes.ts`.
 */
export function episodeEmbed(
  item: NewEpisode,
  urls: { media: string; card: string },
): DiscordEmbed {
  return {
    title: `${item.title} — épisode ${item.episode}`,
    url: urls.media,
    description: formatLag(item.lag),
    timestamp: new Date(item.airingAt * 1000).toISOString(),
    image: { url: urls.card },
  };
}

/** Découpe en paquets de dix, la limite de Discord par message. */
export function chunkEmbeds(embeds: DiscordEmbed[]): DiscordEmbed[][] {
  const chunks: DiscordEmbed[][] = [];

  for (let start = 0; start < embeds.length; start += MAX_EMBEDS_PER_MESSAGE)
    chunks.push(embeds.slice(start, start + MAX_EMBEDS_PER_MESSAGE));

  return chunks;
}

/**
 * Ce que `/settings` montre d'un webhook enregistré : **les quatre derniers chiffres de son id**.
 *
 * Assez pour le reconnaître dans les paramètres du salon Discord, rien du jeton — qui est le
 * secret, et qui ne repart jamais vers le navigateur.
 */
export function webhookHint(url: string): string {
  const id = url.match(/\/webhooks\/(\d+)\//)?.[1] ?? "";

  return `webhook …${id.slice(-4)}`;
}
