import "server-only";

import {
  COMMAND_ENTRIES_COUNT,
  COMMAND_MEDIA_COUNT,
  type CommandResults,
} from "@/features/command/schemas/command.schema";
import {
  formatMediaFormat,
  mediaTitle,
  mirroredTitle,
} from "@/features/media/lib/media-format";
import { mediaTotalUnits } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  ENTRY_STATUS_LABELS,
  type EntryUnit,
} from "@/features/tracking/lib/entry-format";
import { searchEntries } from "@/features/tracking/server/tracking.queries";

/**
 * La lecture de la palette de commandes.
 *
 * `command` est une feature au même titre que `profile` : elle **compose** du suivi et du catalogue
 * sans appartenir à l'un ni à l'autre. Mettre cette fonction dans `tracking` l'obligerait à connaître
 * AniList, et dans `media` à connaître les entrées — d'où une troisième maison.
 *
 * Deux sources, et leur asymétrie est le point important :
 *
 * - **la bibliothèque vient du miroir local**, donc elle est gratuite et instantanée. C'est elle qu'on
 *   interroge à chaque frappe.
 * - **le catalogue vient d'AniList**, donc il est plafonné à 30 requêtes/minute pour tout le monde.
 *   Il passe par `searchMedia`, qui porte le `"use cache"` : deux membres qui tapent « frieren » dans
 *   la même heure ne coûtent qu'une requête.
 *
 * Les deux partent en parallèle : elles sont indépendantes, et les séquencer ajouterait l'attente
 * d'AniList à celle de la base pour rien.
 *
 * **Tout est mis en forme ici**, titres et statuts compris. La palette est un composant client : elle
 * ne peut pas lire la préférence de langue des titres, qui est une lecture serveur. Lui envoyer des
 * libellés finis est donc la seule façon de respecter le réglage du compte (docs/PRODUCT.md §4.6).
 */
export async function getCommandResults(
  query: string,
): Promise<CommandResults> {
  const { titleLanguage, includeAdult } = await getPreferences();

  const [entries, catalogue] = await Promise.all([
    searchEntries({ query, take: COMMAND_ENTRIES_COUNT }),

    /**
     * Une saisie vide ne part pas chez AniList. La palette qui s'ouvre doit répondre « voilà où tu en
     * es » sans dépenser une requête, et une recherche sans terme n'aurait de toute façon rien à
     * classer par pertinence.
     */
    query
      ? searchMedia({
          search: query,
          perPage: COMMAND_MEDIA_COUNT,
          sortField: "SEARCH_MATCH",
          includeAdult,
        })
      : null,
  ]);

  return {
    entries: entries.map((entry) => {
      const total = mediaTotalUnits(entry.media);

      return {
        mediaId: entry.media.id,
        title: mirroredTitle(entry.media, titleLanguage),
        status: ENTRY_STATUS_LABELS[entry.status],
        progress: entry.progress,
        total,
        unit: (entry.media.type === "ANIME"
          ? "episode"
          : "chapitre") satisfies EntryUnit,
        // Le serveur est seul juge du plafond, comme pour le « +1 » des vignettes : une œuvre finie
        // ne doit pas offrir un épisode de plus qui n'existe pas.
        canAdvance: total === null || entry.progress < total,
      };
    }),

    media: (catalogue?.media ?? [])
      /**
       * On retire du catalogue ce que la bibliothèque montre déjà juste au-dessus. Voir deux fois la
       * même œuvre dans deux groupes de la même palette n'apprend rien et fait douter de laquelle est
       * la bonne.
       */
      .filter((item) => !entries.some((entry) => entry.media.id === item.id))
      .map((item) => ({
        id: item.id,
        title: mediaTitle(item.title, titleLanguage),
        meta: [formatMediaFormat(item.format), item.seasonYear]
          .filter(Boolean)
          .join(" · "),
      })),
  };
}
