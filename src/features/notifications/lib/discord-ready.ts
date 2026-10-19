import type { MediaStatus } from "@/features/media/schemas/media.schema";
import type { DiscordEmbed } from "@/features/notifications/schemas/discord.schema";

/**
 * Ce que le cron annonce dans Discord pour les listes « Quand c'est fini » (D50) : **les œuvres
 * qui viennent d'être prêtes** — parution terminée ou annulée —, une fois chacune.
 *
 * Fonctions pures, comme `discord-episodes.ts` : ce qui décide d'écrire ou non à quelqu'un se lit
 * mieux dans un test que dans une boucle d'appels réseau.
 */

/** Une ligne de liste devenue prête, et pas encore annoncée. */
export type ReadyListItem = {
  /** L'id du `ListItem` : c'est lui qu'on marque comme annoncé. */
  itemId: string;
  mediaId: number;
  /** Déjà résolu dans la langue du compte. */
  title: string;
  status: MediaStatus;
  cover: string | null;
  isAdult: boolean;
  listTitle: string;
  /** Le compte l'a déjà terminée : ce n'est plus une nouvelle. */
  seen: boolean;
};

export type ReadyAnnouncement = {
  mediaId: number;
  title: string;
  status: MediaStatus;
  cover: string | null;
  /** Les listes « Quand c'est fini » qui l'attendaient — souvent une seule. */
  lists: string[];
};

/**
 * Ce qu'on annonce, et ce qu'on marque.
 *
 * **Tout ce qui a été examiné est marqué**, annoncé ou non : une œuvre déjà vue, ou masquée par la
 * préférence 18+ du compte, n'a pas à ressortir le jour où l'on change d'avis — ce serait une
 * nouvelle d'il y a trois mois. Une œuvre rangée dans deux listes n'est annoncée qu'une fois, avec
 * les deux noms.
 */
export function readyAnnouncements(
  items: ReadyListItem[],
  { includeAdult }: { includeAdult: boolean },
): { announcements: ReadyAnnouncement[]; settledItemIds: string[] } {
  const byMedia = new Map<number, ReadyAnnouncement>();

  for (const item of items) {
    if (item.seen || (item.isAdult && !includeAdult)) continue;

    const existing = byMedia.get(item.mediaId);
    if (existing) {
      if (!existing.lists.includes(item.listTitle))
        existing.lists.push(item.listTitle);
      continue;
    }

    byMedia.set(item.mediaId, {
      mediaId: item.mediaId,
      title: item.title,
      status: item.status,
      cover: item.cover,
      lists: [item.listTitle],
    });
  }

  return {
    announcements: [...byMedia.values()].sort((a, b) =>
      a.title.localeCompare(b.title, "fr"),
    ),
    settledItemIds: items.map((item) => item.itemId),
  };
}

/** « « A lire une fois fini » », « « A » et « B » », « « A », « B » et « C » ». */
function quotedList(names: string[]): string {
  const quoted = names.map((name) => `« ${name} »`);
  if (quoted.length <= 1) return quoted.join("");
  return `${quoted.slice(0, -1).join(", ")} et ${quoted.at(-1)}`;
}

/**
 * Le message d'une œuvre prête. Le titre est l'œuvre, la phrase dit **pourquoi on en parle** —
 * l'attente est finie — et où elle attendait. La jaquette sert d'image : c'est elle qu'on
 * reconnaît dans un salon.
 */
export function readyEmbed(
  item: ReadyAnnouncement,
  urls: { media: string },
): DiscordEmbed {
  const why =
    item.status === "CANCELLED"
      ? "Parution arrêtée, il n'y aura pas de suite"
      : "Parution terminée";

  return {
    title: item.title,
    url: urls.media,
    description: `${why} : elle t'attend dans ${quotedList(item.lists)}.`,
    ...(item.cover ? { image: { url: item.cover } } : {}),
  };
}
