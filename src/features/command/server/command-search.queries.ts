import "server-only";

import type { CommandSearchResult } from "@/features/command/schemas/command-search.schema";
import {
  formatMediaFormat,
  mediaTitle,
} from "@/features/media/lib/media-format";
import { EMPTY_FILTERS } from "@/features/media/lib/search-params";
import { searchMediaInputSchema } from "@/features/media/schemas/search-media.schema";
import { searchMediaInMirror } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getLibraryEntriesFor } from "@/features/tracking/server/library.queries";

/**
 * Combien de résultats la palette montre.
 *
 * Cinq : ce que la fenêtre tient sans défiler au-dessus du groupe « Aller à ». Au-delà, c'est la
 * page `/search` qu'il faut — et le lien « Tout voir » est là pour ça.
 */
const COMMAND_SEARCH_SIZE = 5;

/**
 * La recherche de la palette : cinq œuvres, **dans la langue du compte, annotées de mon suivi**.
 *
 * **Aucune lecture AniList nouvelle.** C'est `searchMedia`, la même que `/search`, avec son
 * `"use cache"` d'une heure : taper « frieren » dans la palette puis sur la page ne coûte qu'une
 * requête chacune, et la même recherche relancée par un autre membre du cercle n'en coûte aucune.
 *
 * Les deux préférences s'appliquent **hors du cache**, comme partout dans le dépôt : `includeAdult`
 * part dans les paramètres — il change la réponse d'AniList —, `titleLanguage` ne s'applique qu'au
 * moment de composer la ligne.
 *
 * **Le repli de panne est celui de `/search`** : quand AniList ne répond pas, la copie locale sert
 * ce qu'elle a. Elle ne connaît pas l'année d'une œuvre, d'où `year: null` sur ce chemin.
 */
export async function searchForCommand(
  q: string,
): Promise<CommandSearchResult> {
  const { includeAdult, titleLanguage } = await getPreferences();

  const result = await searchMedia(
    searchMediaInputSchema.parse({
      search: q,
      page: 1,
      perPage: COMMAND_SEARCH_SIZE,
      sortField: "SEARCH_MATCH",
      includeAdult,
    }),
  );

  const fallback = result
    ? null
    : await searchMediaInMirror({
        filters: { ...EMPTY_FILTERS, q },
        includeAdult,
        page: 1,
        perPage: COMMAND_SEARCH_SIZE,
      });

  const rows = result
    ? result.items.map((media) => ({
        media,
        year: media.seasonYear ?? media.startDate?.year ?? null,
      }))
    : (fallback?.items ?? []).map((media) => ({ media, year: null }));

  // Une requête en base pour les cinq, sur l'index d'unicité `[userId, mediaId]` — elle ne touche
  // pas au quota AniList.
  const entries = await getLibraryEntriesFor(rows.map(({ media }) => media.id));

  return {
    items: rows.map(({ media, year }) => ({
      id: media.id,
      title: mediaTitle(media.title, titleLanguage),
      format: formatMediaFormat(media.format),
      year,
      cover: media.coverImage?.medium ?? media.coverImage?.large ?? null,
      status: entries.get(media.id)?.status ?? null,
    })),
    total: result?.total ?? fallback?.total ?? 0,
    totalIsCapped: result?.totalIsCapped ?? false,
    fromMirror: result === null,
  };
}
