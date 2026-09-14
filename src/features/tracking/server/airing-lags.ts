import "server-only";

import type { MediaCompact } from "@/features/media/schemas/media.schema";
import { getAiringSchedule } from "@/features/media/server/media.queries";
import {
  episodeLag,
  latestAiredPerMedia,
} from "@/features/tracking/lib/airing-lag";

/**
 * **Ce qui est sorti et que je n'ai pas vu**, série par série.
 *
 * C'est le rapprochement de `/calendar`, resserré sur le passé proche : ce que je suis vient de mes
 * lignes `Entry` — déjà lues par l'appelant, on ne les redemande pas —, la grille horaire vient
 * d'AniList (`getAiringSchedule`, mémorisée ; sans quoi le quota de trente requêtes par minute
 * partagé par toute l'IP y passerait). Les deux ne se rencontrent qu'ici.
 *
 * **Parti du `_lib/` de l'accueil, promu ici le 14 septembre 2026, quand la cloche de l'en-tête en
 * a eu besoin** : elle pose exactement la question de la rangée « En cours » — combien d'épisodes
 * diffusés je n'ai pas vus —, mais depuis les dix routes au lieu d'une seule. Deuxième consommateur,
 * donc `features/`, et `tracking/` parce que le retard n'existe que par `Entry.progress`. La règle
 * de promotion d'ARCHITECTURE.md, la même qui a fait monter `airing-lag.ts` d'à côté.
 */

const HOUR_IN_SECONDS = 3600;
const CATCH_UP_DAYS = 7;

/**
 * La fenêtre où l'on va chercher ce qui vient de sortir : **les sept derniers jours, arrondis à
 * l'heure**.
 *
 * L'arrondi n'est pas une approximation, c'est ce qui rend la lecture mémorisable. Les deux bornes
 * forment la clé du `"use cache"` de `getAiringSchedule` : calculées à la seconde, deux visites
 * espacées d'un instant poseraient deux entrées pour la même question, et chaque affichage coûterait
 * un crédit du quota partagé. À l'heure, c'est une entrée par heure — et une grille horaire ne bouge
 * pas plus vite que ça.
 *
 * **C'est aussi ce qui rend la cloche gratuite.** Elle pose la même question que l'accueil, à la
 * même heure, sur les mêmes ids : elle tombe donc dans l'entrée de cache que l'accueil vient de
 * poser, et n'ajoute rien au quota.
 *
 * La borne haute est **la fin de l'heure en cours**, donc un peu dans l'avenir : ce qui n'a pas
 * encore été diffusé est écarté à la lecture par `latestAiredPerMedia`, qui compare à l'instant
 * réel. Une borne posée à l'heure pleine passée aurait au contraire perdu l'épisode sorti il y a dix
 * minutes, c'est-à-dire exactement celui qu'on existe pour montrer.
 *
 * Sept jours parce qu'un anime diffuse par semaine : c'est la fenêtre qui attrape le dernier épisode
 * de chaque série suivie, sans ramener un trimestre de grille pour rien.
 */
export function recentAiringWindow(now: Date) {
  const to =
    Math.ceil(now.getTime() / 1000 / HOUR_IN_SECONDS) * HOUR_IN_SECONDS;

  return { from: to - CATCH_UP_DAYS * 24 * HOUR_IN_SECONDS, to };
}

/** Ce qu'un épisode sorti change à une ligne de suivi : son retard, et sa fraîcheur. */
export type AiringLag = {
  /** Combien d'épisodes diffusés je n'ai pas vus. Toujours strictement positif ici. */
  lag: number;
  /** Le numéro du dernier épisode diffusé — celui que la cloche nomme. */
  episode: number;
  /** Quand il a été diffusé — ce qui décide de l'ordre. */
  airedAt: number;
};

/**
 * Le strict nécessaire pour situer un retard : une œuvre, et où j'en suis.
 *
 * Structurel plutôt que nominal, et c'est ce qui permet aux deux appelants de passer leur propre
 * forme — `LibraryItem` pour l'accueil, `AiringWatchlistItem` pour la cloche — sans qu'aucun n'ait
 * à se convertir dans celle de l'autre.
 */
type LaggableItem = {
  media: { id: number; type: MediaCompact["type"] };
  entry: { progress: number };
};

/**
 * Le retard de chaque série suivie, **absente de la table quand il est nul**.
 *
 * **Seuls les animes sont demandés.** `AIRING_SCHEDULE_QUERY` interroge une grille de diffusion
 * télévisée, qui n'existe pas pour un manga : envoyer l'id d'un webtoon reviendrait à faire
 * confirmer un vide, au prix d'une clé de cache plus large. Sans anime en cours, aucune requête ne
 * part — `getAiringSchedule` s'arrête sur une liste d'ids vide.
 *
 * **Le retard se calcule sur le dernier épisode réellement diffusé**, pas sur le nombre de
 * diffusions de la fenêtre : une série qui sort deux épisodes d'un coup met en retard de deux, et
 * une série muette depuis six jours garde le retard de son dernier épisode.
 *
 * **AniList muet rend `null`, pas une table vide** — la distinction est tout ce qui sépare « rien de
 * neuf » de « on n'a pas pu savoir ». L'accueil retombe sur la progression, la cloche le dit ; les
 * confondre serait le seul mensonge que ce rapprochement puisse commettre.
 */
export async function airingLags(
  items: LaggableItem[],
  now: Date,
): Promise<Map<number, AiringLag> | null> {
  const { from, to } = recentAiringWindow(now);
  const schedule = await getAiringSchedule({
    mediaIds: items
      .filter((item) => item.media.type === "ANIME")
      .map((item) => item.media.id),
    from,
    to,
  });

  if (!schedule) return null;

  const latest = latestAiredPerMedia(schedule.schedules, now);
  const lags = new Map<number, AiringLag>();

  for (const item of items) {
    const slot = latest.get(item.media.id);
    if (!slot) continue;

    const lag = episodeLag({
      episode: slot.episode,
      progress: item.entry.progress,
      aired: true,
    });

    if (lag > 0)
      lags.set(item.media.id, {
        lag,
        episode: slot.episode,
        airedAt: slot.airingAt,
      });
  }

  return lags;
}
