import "server-only";

import { mediaTitle } from "@/features/media/lib/media-format";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import type { EpisodeNotifications } from "@/features/tracking/schemas/notifications.schema";
import { airingLags } from "@/features/tracking/server/airing-lags";
import { getAiringWatchlist } from "@/features/tracking/server/library.queries";

/**
 * Ce que la cloche de l'en-tête a à dire.
 *
 * Le même rapprochement que la rangée « En cours » de l'accueil — `getAiringWatchlist` pour la
 * moitié « moi », `airingLags` pour la moitié AniList —, mais posé une fois par chargement depuis
 * n'importe laquelle des dix routes, au lieu d'une seule.
 *
 * **Ça ne coûte rien au quota.** `airingLags` interroge une fenêtre arrondie à l'heure : la cloche
 * pose exactement la question que l'accueil vient de poser, sur les mêmes ids, donc elle tombe dans
 * l'entrée de `"use cache"` déjà remplie. Ce qu'elle ajoute est une requête Postgres par
 * chargement — sur un cercle de quatre comptes, rien.
 *
 * **Bornée à `CURRENT` et `REPEATING`** par `getAiringWatchlist`, et c'est ce qui la rend lisible :
 * une série seulement planifiée afficherait une saison entière de retard et noierait les deux
 * lignes qui comptent.
 *
 * **Rangée par diffusion la plus récente**, et non par retard décroissant : ce qui vient de sortir
 * est ce qu'on est venu voir, quand « 11 épisodes de retard » est une dette, pas une nouvelle.
 */
export async function getEpisodeNotifications(
  now: Date = new Date(),
): Promise<EpisodeNotifications> {
  const { includeAdult, titleLanguage } = await getPreferences();
  const watchlist = await getAiringWatchlist({ includeAdult });
  const lags = await airingLags(watchlist, now);

  if (!lags) return { unavailable: true, items: [] };

  const items = watchlist
    .flatMap((item) => {
      const found = lags.get(item.media.id);
      if (!found) return [];

      return [
        {
          mediaId: item.media.id,
          title: mediaTitle(item.media.title, titleLanguage),
          /*
            `large`, comme `MediaCard` — et non `medium`, qui aurait laissé croire à une vignette
            plus légère : le miroir ne stocke **qu'une** URL et la recopie dans les trois tailles
            (`compactFromMirror`). Le choix nomme donc une intention, pas des octets, et autant
            qu'il nomme la même que partout ailleurs.
          */
          cover: item.media.coverImage?.large ?? null,
          episode: found.episode,
          lag: found.lag,
          airedAt: found.airedAt,
        },
      ];
    })
    .sort((first, second) => second.airedAt - first.airedAt);

  return { unavailable: false, items };
}
