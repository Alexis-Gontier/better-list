import {
  SCORE_STAR_STEP,
  SCORE_STARS,
  scoreToStars,
} from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Les mises en forme des statistiques du profil.
 *
 * Fonctions **pures** : elles prennent ce que la base rend — des comptes bruts, des tableaux de
 * genres — et en font ce que les graphes attendent. Elles vivent ici et non dans les requêtes
 * parce que c'est là qu'elles se testent (`profile-stats.test.ts`), et parce que le choix « dix
 * paliers » ou « huit genres » est une décision d'affichage, pas une décision de lecture.
 */

/** Une part de la répartition par statut. */
export type StatusSlice = {
  status: EntryStatus;
  count: number;
};

/** Une barre de l'histogramme des notes : une demi-étoile par barre, donc dix barres. */
export type ScoreBar = {
  stars: number;
  count: number;
};

/** Une barre du classement des genres. */
export type GenreBar = {
  genre: string;
  count: number;
};

/** Le nombre de genres affichés. Au-delà, la queue est longue et ne dit plus rien. */
export const TOP_GENRES = 8;

/**
 * Les notes brutes → les dix paliers d'étoiles.
 *
 * **Le regroupement est indispensable, il n'est pas cosmétique.** `Entry.score` est stocké sur
 * 0–100 (docs/PRODUCT.md §4.2) et les notes importées d'AniList occupent toute cette plage : un
 * `groupBy` sur la colonne rend jusqu'à cent lignes distinctes, dont un histogramme de dix barres
 * ne peut rien faire. `scoreToStars` est la même conversion que celle du panneau de suivi et du
 * journal — une note de 85 tombe sur 4,5, ici comme ailleurs.
 *
 * **Les dix paliers sont toujours rendus, y compris à zéro.** Une échelle d'étoiles à trous se lit
 * comme une échelle continue mal graduée : on croit que 2,5 n'existe pas, alors que personne ne
 * l'a donnée.
 */
export function scoreBars(
  rows: Array<{ score: number | null; count: number }>,
): ScoreBar[] {
  const byStars = new Map<number, number>();

  for (const row of rows) {
    if (row.score === null) continue;

    const stars = scoreToStars(row.score);
    // Une note de 0 tombe sur 0 étoile, qui n'est pas un palier : l'échelle part d'une demie.
    if (stars < SCORE_STAR_STEP) continue;

    byStars.set(stars, (byStars.get(stars) ?? 0) + row.count);
  }

  const bars: ScoreBar[] = [];

  for (
    let stars = SCORE_STAR_STEP;
    stars <= SCORE_STARS;
    stars += SCORE_STAR_STEP
  ) {
    /*
      Les étoiles sont des multiples de 0,5 accumulés en virgule flottante : 0,1 + 0,2 ≠ 0,3, et
      la même règle vaut ici dès qu'on additionne assez de demies. On arrondit donc la clé avant de
      chercher, sans quoi 3,5000000000000004 ne retrouverait jamais le 3,5 posé par `scoreToStars`.
    */
    const key = Math.round(stars * 2) / 2;
    bars.push({ stars: key, count: byStars.get(key) ?? 0 });
  }

  return bars;
}

/**
 * Les genres de chaque œuvre suivie → le classement des plus représentés.
 *
 * **Compté en mémoire et non en SQL**, à dessein. `Media.genres` est un `String[]` PostgreSQL : le
 * dénombrer en base demanderait un `unnest` en SQL brut, donc une requête que Prisma ne type pas,
 * pour trier quelques centaines de lignes qu'on a déjà. Le cercle compte quatre comptes et les
 * bibliothèques quelques centaines d'œuvres ; le jour où ce ne serait plus vrai, c'est la lecture
 * qu'il faudrait changer, pas cette fonction.
 *
 * **Les ex æquo sont départagés par ordre alphabétique** plutôt que laissés à l'ordre d'arrivée :
 * sans cela, deux genres à 24 œuvres pourraient permuter d'un rechargement à l'autre, et un
 * classement qui bouge sans que rien n'ait changé donne l'impression d'un bug.
 */
export function topGenres(
  genresPerEntry: string[][],
  limit: number = TOP_GENRES,
): GenreBar[] {
  const counts = new Map<string, number>();

  for (const genres of genresPerEntry) {
    for (const genre of genres) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count || a.genre.localeCompare(b.genre))
    .slice(0, limit);
}

/**
 * Minutes par épisode, faute de mieux.
 *
 * **C'est une estimation, et le miroir ne permet pas d'en faire une meilleure** : `Media` ne stocke
 * pas `duration` (docs/PRODUCT.md §4.1 — on n'y garde que de quoi afficher une carte et trier), et
 * aller la chercher chez AniList pour chaque œuvre suivie coûterait le quota entier pour un chiffre
 * décoratif. Vingt-quatre minutes est la durée d'un épisode de série télévisée standard ; les films
 * et les OVA la sous-estiment, les formats courts la surestiment.
 *
 * L'intitulé affiché dit « heures de visionnage » sans prétendre à l'exactitude, et c'est le seul
 * chiffre de l'écran dans ce cas.
 */
const MINUTES_PER_EPISODE = 24;

/** Épisodes vus → heures de visionnage, arrondies à l'heure. */
export function watchedHours(episodes: number): number {
  return Math.round((episodes * MINUTES_PER_EPISODE) / 60);
}
