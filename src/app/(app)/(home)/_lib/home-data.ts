import "server-only";

import { cache } from "react";

import { getLists } from "@/features/lists/server/lists.queries";
import { currentSeason } from "@/features/media/lib/media-season";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import {
  type AiringLag,
  airingLags,
} from "@/features/tracking/server/airing-lags";
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

  /*
    AniList muet rend `null` ici, et la rangée retombe alors sur l'ordre de la base : annoncer
    « à jour » sur la foi d'une panne serait le seul mensonge qu'elle puisse commettre. La cloche
    de l'en-tête, elle, a la place de le dire — c'est pourquoi `airingLags` distingue les deux cas
    plutôt que de rendre une table vide.
  */
  const lags =
    (await airingLags(active, new Date())) ?? new Map<number, AiringLag>();
  const current: TrackedItem[] = active
    .map((item) => ({
      ...item,
      ...(lags.get(item.media.id) ?? { lag: 0, episode: 0, airedAt: 0 }),
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
