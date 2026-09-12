/**
 * Le retard, **épisode par épisode** — ce que le planning a de plus que les calendriers publics.
 *
 * Icotaku, Nautiljon, Myutaku et Crunchyroll disent ce qui sort ; ils ne disent pas où l'on en est,
 * parce qu'ils ne le savent pas. Seuls les suivis — Trakt, Sonarr — l'affichent, et c'est la
 * catégorie de Better-List (relevé du 8 septembre 2026, docs/JOURNAL.md). Ce fichier est donc la
 * seule chose de cet écran qu'on ne pouvait pas aller copier ailleurs.
 *
 * Fonctions pures et testées, comme `airing-week.ts` d'à côté : un décalage d'un épisode se lit mal
 * dans du JSX, et se lit très bien dans un test.
 */

/**
 * Cet épisode est-il **déjà passé** ?
 *
 * La comparaison se fait en secondes contre `airingAt`, l'unité d'AniList (`media.schema.ts`) —
 * plutôt qu'en convertissant les deux côtés en `Date`, ce qui introduirait un fuseau là où il n'y a
 * qu'un instant.
 */
export function hasAired(airingAt: number, now: Date): boolean {
  return airingAt * 1000 <= now.getTime();
}

/**
 * Combien d'épisodes **disponibles** je n'ai pas vus, au moment où celui-ci passe.
 *
 * La subtilité est dans « disponibles », et elle vaut un épisode entier :
 *
 * - un épisode **déjà diffusé** compte dans ce que je pourrais avoir vu. À l'instant où l'épisode 12
 *   passe et que j'en suis à 10, j'ai deux épisodes de retard — le 11 et le 12 ;
 * - un épisode **à venir** ne compte pas : on n'est pas en retard sur ce qui n'est pas encore sorti.
 *   Le même épisode 12, annoncé pour samedi, ne me met en retard que d'un — le 11.
 *
 * Sans cette distinction, le planning annoncerait un épisode de retard supplémentaire sur chaque
 * série à jour, tous les jours de la semaine à venir. C'est le genre de faux positif qui apprend à
 * ne plus regarder l'écran.
 *
 * Borné à zéro : une progression en avance sur la grille horaire — un visionnage en avant-première,
 * un décalage de la base AniList — n'est pas un retard négatif, c'est zéro.
 */
export function episodeLag({
  episode,
  progress,
  aired,
}: {
  /** Le numéro de l'épisode qui passe. */
  episode: number;
  /** Où j'en suis, tel que `Entry.progress` le porte. */
  progress: number;
  /** Le résultat de `hasAired` pour cet épisode. */
  aired: boolean;
}): number {
  const released = aired ? episode : episode - 1;

  return Math.max(0, released - progress);
}

/**
 * Le retard en toutes lettres — **jamais en pictogramme**.
 *
 * C'est la décision qui a écarté la grille de sept colonnes : à 142 px de large, « 11 épisodes de
 * retard » devenait « +11 », et le sujet de l'écran se réduisait à un signe à décoder. La liste a
 * la place de l'écrire, donc elle l'écrit.
 *
 * « À jour » plutôt que rien quand le retard est nul : une ligne muette se lit comme une ligne dont
 * l'information n'a pas chargé.
 */
export function formatLag(lag: number): string {
  if (lag <= 0) return "à jour";

  return lag === 1 ? "1 épisode de retard" : `${lag} épisodes de retard`;
}
