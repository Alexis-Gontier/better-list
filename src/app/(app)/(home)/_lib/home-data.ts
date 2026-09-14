import "server-only";

import { cache } from "react";

import { getLists } from "@/features/lists/server/lists.queries";
import { currentSeason } from "@/features/media/lib/media-season";
import type { AiringSchedule } from "@/features/media/schemas/media.schema";
import {
  getAiringSchedule,
  searchMedia,
} from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { episodeLag, hasAired } from "@/features/tracking/lib/airing-lag";
import {
  getHomeTracking,
  getLibraryEntriesFor,
  type HomeTrackingItem,
  type LibraryItem,
} from "@/features/tracking/server/library.queries";

/**
 * Les lectures de l'accueil, **une par zone suspendue**.
 *
 * L'accueil compose celles de `/library`, `/lists`, `/search` et `/calendar` ; les seules qui lui
 * soient propres sont `getHomeTracking`, qui sépare « en cours » et « à reprendre », et le
 * rapprochement du retard, plus bas. Les zones sont séparées pour que chacune s'affiche dès qu'elle
 * est prête, et `cache` de React dédoublonne celles qui lisent la même chose.
 *
 * **Une zone, une question, une requête AniList.** Le carrousel du haut et la rangée de saison
 * avaient un chargeur commun qui lançait cinq recherches d'un coup : la bannière n'arrivait qu'une
 * fois les cinq revenues, pour n'en lire qu'une seule. Chacune a désormais la sienne.
 */

/** Assez pour qu'une rangée ait de quoi défiler au palier le plus large. */
const RAIL_COUNT = 20;

/** Ce que les recherches de catalogue de l'accueil ont en commun. */
const catalogueBase = (includeAdult: boolean) => ({
  page: 1,
  perPage: RAIL_COUNT,
  sortDirection: "DESC" as const,
  includeAdult,
});

// --- Mon suivi -------------------------------------------------------------------

const HOUR_IN_SECONDS = 3600;
const CATCH_UP_DAYS = 7;

/**
 * La fenêtre où l'on va chercher ce qui vient de sortir : **les sept derniers jours, arrondis à
 * l'heure**.
 *
 * L'arrondi n'est pas une approximation, c'est ce qui rend la lecture mémorisable. Les deux bornes
 * forment la clé du `"use cache"` de `getAiringSchedule` : calculées à la seconde, deux visites
 * espacées d'un instant poseraient deux entrées pour la même question, et chaque affichage de
 * l'accueil coûterait un crédit du quota partagé. À l'heure, c'est une entrée par heure — et une
 * grille horaire ne bouge pas plus vite que ça.
 *
 * La borne haute est **la fin de l'heure en cours**, donc un peu dans l'avenir : ce qui n'a pas
 * encore été diffusé est écarté à la lecture par `hasAired`, qui compare à l'instant réel. Une
 * borne posée à l'heure pleine passée aurait au contraire perdu l'épisode sorti il y a dix minutes,
 * c'est-à-dire exactement celui que cette rangée existe pour montrer.
 *
 * Sept jours parce qu'un anime diffuse par semaine : c'est la fenêtre qui attrape le dernier
 * épisode de chaque série suivie, sans ramener un trimestre de grille pour rien.
 */
function recentAiringWindow(now: Date) {
  const to =
    Math.ceil(now.getTime() / 1000 / HOUR_IN_SECONDS) * HOUR_IN_SECONDS;

  return { from: to - CATCH_UP_DAYS * 24 * HOUR_IN_SECONDS, to };
}

/** Ce qu'un épisode sorti change à une ligne de suivi : son retard, et sa fraîcheur. */
type AiringLag = {
  /** Combien d'épisodes diffusés je n'ai pas vus. Toujours strictement positif ici. */
  lag: number;
  /** Quand le dernier a été diffusé — ce qui décide de l'ordre de la rangée. */
  airedAt: number;
};

/**
 * **Ce qui est sorti et que je n'ai pas vu**, série par série.
 *
 * C'est le rapprochement de `/calendar`, resserré sur le passé proche : ce que je suis vient de mes
 * lignes `Entry` — déjà lues, on ne les redemande pas —, la grille horaire vient d'AniList
 * (`getAiringSchedule`, mémorisée quelques minutes ; sans quoi le quota de trente requêtes par
 * minute partagé par toute l'IP y passerait). Les deux ne se rencontrent qu'ici.
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
 * Une série à jour n'entre pas dans la table, et AniList muet la rend vide : la rangée retombe
 * alors sur la progression. Annoncer « à jour » sur la foi d'une panne serait le seul mensonge
 * qu'elle puisse commettre.
 */
async function airingLags(items: LibraryItem[], now: Date) {
  const { from, to } = recentAiringWindow(now);
  const schedule = await getAiringSchedule({
    mediaIds: items
      .filter((item) => item.media.type === "ANIME")
      .map((item) => item.media.id),
    from,
    to,
  });

  const lags = new Map<number, AiringLag>();
  if (!schedule) return lags;

  /** La dernière diffusion **déjà passée** de chaque série, dans la fenêtre. */
  const latest = new Map<number, AiringSchedule>();
  for (const slot of schedule.schedules) {
    if (!hasAired(slot.airingAt, now)) continue;

    const known = latest.get(slot.mediaId);
    if (!known || slot.airingAt > known.airingAt)
      latest.set(slot.mediaId, slot);
  }

  for (const item of items) {
    const slot = latest.get(item.media.id);
    if (!slot) continue;

    const lag = episodeLag({
      episode: slot.episode,
      progress: item.entry.progress,
      aired: true,
    });
    if (lag > 0) lags.set(item.media.id, { lag, airedAt: slot.airingAt });
  }

  return lags;
}

/** Une ligne de « En cours », **et ce qui l'attend** : zéro quand il n'y a rien de nouveau. */
export type TrackedItem = LibraryItem & AiringLag;

/** Une ligne de « À reprendre », **et ce qu'il en reste** : `null` quand le total est inconnu. */
export type ResumableItem = HomeTrackingItem & { remaining: number | null };

/**
 * Ce qu'il reste à voir ou à lire — **`null` dès que la réponse serait devinée**.
 *
 * AniList ignore le nombre de chapitres de la plupart des webtoons en cours (docs/fiche-media.md),
 * et une progression plus grande que le total arrive sur une série dont le miroir a pris du retard.
 * Dans les deux cas, un reste calculé serait faux — et un « il reste 0 chapitre » sur une série en
 * pause se lirait comme une série finie.
 */
function remainingUnits(item: LibraryItem): number | null {
  const { total } = item;
  if (!total || total <= item.entry.progress) return null;

  return total - item.entry.progress;
}

/**
 * Le rang d'une série dont on ne sait pas ce qu'il reste : **le dernier**.
 *
 * `Infinity` aurait été le choix naturel, mais deux valeurs infinies se soustraient en `NaN`, et un
 * comparateur qui rend `NaN` laisse l'ordre au hasard du moteur — exactement là où l'on veut, au
 * contraire, que l'ordre reçu de la base tienne.
 */
const UNKNOWN_REMAINING = Number.MAX_SAFE_INTEGER;

/**
 * Mon suivi, en deux piles : « en cours » et « à reprendre ».
 *
 * **« En cours » porte le retard, et se range dessus** (décision d'Alexis du 14 septembre 2026).
 * Les épisodes sortis ont eu leur propre rangée pendant une heure ; elle montrait les mêmes
 * jaquettes que celle du dessous, à trois près. Fusionnées, la rangée répond aux deux questions
 * d'un coup — ce que je regarde, et ce qui m'attend en tête de file.
 *
 * **Le prix en est que cette zone attend AniList**, elle qui ne lisait que la base. Il est mesuré :
 * la grille horaire est mémorisée en minutes, donc la demande est le plus souvent déjà servie, et
 * une panne rend la table vide plutôt qu'une erreur — la rangée affiche alors la progression, dans
 * le même ordre qu'avant.
 *
 * Le classement se fait sur la **fraîcheur** du dernier épisode, pas sur la taille du retard : la
 * rangée met en avant ce qui vient de sortir, pas ce qu'on a le plus laissé filer. À égalité — donc
 * pour tout ce qui n'a rien de neuf —, l'ordre de `getHomeTracking` tient, du plus récemment touché
 * au plus ancien.
 *
 * **« À reprendre » se range sur ce qu'il reste**, du plus près de la fin au plus loin (décision
 * d'Alexis du 14 septembre 2026). L'ancienneté classait avant, et elle n'a jamais fait reprendre
 * personne : sur cinquante-huit séries en pause, celle où il reste six chapitres se rattrape ce
 * soir, celle qui en a cent quatre-vingts non. Les séries dont AniList ignore le total passent
 * derrière, dans l'ordre reçu — c'est le dernier geste qui les départage encore.
 *
 * Chaque rangée est plafonnée ici : son titre mène à la bibliothèque filtrée, qui montre le reste.
 * **Le classement passe avant le plafond** : trancher d'abord ferait manquer l'épisode sorti hier
 * sur une série qu'on n'a pas ouverte depuis un mois, ou la série qu'il restait deux chapitres à
 * finir.
 */
export const loadTracking = cache(async () => {
  const { includeAdult, titleLanguage } = await getPreferences();
  const { active, resumable } = await getHomeTracking({ includeAdult });

  const lags = await airingLags(active, new Date());
  const current: TrackedItem[] = active
    .map((item) => ({
      ...item,
      ...(lags.get(item.media.id) ?? { lag: 0, airedAt: 0 }),
    }))
    .sort((first, second) => second.airedAt - first.airedAt)
    .slice(0, RAIL_COUNT);

  const toResume: ResumableItem[] = resumable
    .map((item) => ({ ...item, remaining: remainingUnits(item) }))
    .sort(
      (first, second) =>
        (first.remaining ?? UNKNOWN_REMAINING) -
        (second.remaining ?? UNKNOWN_REMAINING),
    )
    .slice(0, RAIL_COUNT);

  return { titleLanguage, active: current, resumable: toResume };
});

export async function loadLists() {
  const { includeAdult } = await getPreferences();
  return getLists({ includeAdult });
}

// --- Découverte ------------------------------------------------------------------

/**
 * Les tendances animes, **seules** — le carrousel du haut n'a besoin de rien d'autre.
 *
 * Une zone, une requête : la bannière s'affiche dès cette réponse-là, au lieu d'attendre celles des
 * rangées qui vivent plus bas.
 */
export const loadTrending = cache(async () => {
  const { includeAdult, titleLanguage } = await getPreferences();
  const trending = await searchMedia({
    ...catalogueBase(includeAdult),
    type: "ANIME",
    sortField: "TRENDING",
  });

  // Une liste vide quand AniList ne répond pas : l'écran retire la zone plutôt que d'afficher un
  // cadre creux.
  return { titleLanguage, anime: trending?.items ?? [] };
});

/**
 * Mon suivi des œuvres à la une — **ce qui rend le carrousel personnel**.
 *
 * Même lecture que pour la rangée de saison, et même prix : une requête en base sur l'index
 * d'unicité `[userId, mediaId]`, rien au quota AniList. Elle porte sur les vingt tendances et non
 * sur les six retenues — la page choisit les siennes après coup, en filtrant sur la bannière, et
 * une lecture qui suivrait ce choix obligerait à le refaire ici.
 */
export const loadTrendingEntries = cache(async () => {
  const { anime } = await loadTrending();

  return getLibraryEntriesFor(anime.map((media) => media.id));
});

/** Les animes les plus populaires de la saison en cours. */
export const loadSeason = cache(async () => {
  const { includeAdult, titleLanguage } = await getPreferences();
  const season = currentSeason();
  const seasonal = await searchMedia({
    ...catalogueBase(includeAdult),
    type: "ANIME",
    sortField: "POPULARITY",
    season: season.season,
    seasonYear: season.seasonYear,
  });

  return { titleLanguage, season, seasonal: seasonal?.items ?? [] };
});

/**
 * Mon suivi des œuvres de la rangée de saison — **ce qui allume leurs pastilles**, comme sur
 * `/search`.
 *
 * Une seule lecture en base pour toute la rangée, sur l'index d'unicité `[userId, mediaId]` : elle
 * ne touche pas au quota AniList.
 */
export const loadSeasonEntries = cache(async () => {
  const { seasonal } = await loadSeason();

  return getLibraryEntriesFor(seasonal.map((media) => media.id));
});
