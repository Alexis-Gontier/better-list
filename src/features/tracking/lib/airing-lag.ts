/**
 * Le retard, **épisode par épisode** — ce que le planning a de plus que les calendriers publics.
 *
 * Icotaku, Nautiljon, Myutaku et Crunchyroll disent ce qui sort ; ils ne disent pas où l'on en est,
 * parce qu'ils ne le savent pas. Seuls les suivis — Trakt, Sonarr — l'affichent, et c'est la
 * catégorie de Better-List (relevé du 8 septembre 2026, l'historique git). Ce fichier est donc la
 * seule chose de cet écran qu'on ne pouvait pas aller copier ailleurs.
 *
 * Fonctions pures et testées, comme `airing-week.ts` d'à côté : un décalage d'un épisode se lit mal
 * dans du JSX, et se lit très bien dans un test.
 *
 * **Parti du `_lib/` de `/calendar`, promu ici le 14 septembre 2026, quand l'accueil en a eu
 * besoin** : sa rangée « Nouveaux épisodes » pose exactement la question du planning — combien
 * d'épisodes diffusés je n'ai pas vus. Deuxième route, donc `features/`, et `tracking/` plutôt que
 * `media/` : le retard n'existe que par `Entry.progress`. La règle de promotion d'CLAUDE.md,
 * appliquée comme elle l'a été pour `MediaCard`.
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

/**
 * La dernière diffusion **déjà passée** de chaque série, dans une grille horaire quelconque.
 *
 * Ce n'est pas un maximum sur `airingAt`, et c'est tout l'intérêt : la grille d'une fenêtre qui
 * mord sur l'avenir contient l'épisode de samedi prochain, qui serait le plus récent et qu'il ne
 * faut surtout pas retenir — `episodeLag` compterait alors un épisode de retard sur une série à
 * jour. Le filtre `hasAired` passe donc **avant** la comparaison, jamais après.
 *
 * La comparaison est explicite plutôt que confiée à l'ordre d'arrivée : AniList rend sa grille
 * triée, mais rien dans le contrat ne le promet, et une réduction qui dépend d'une promesse non
 * écrite se casse le jour où elle change.
 *
 * Générique sur la forme reçue : la fonction ne lit que `mediaId` et `airingAt`, et rend la
 * diffusion **entière** — l'appelant a besoin de son `episode`, qui ne la regarde pas. C'est aussi
 * ce qui la garde à l'écart des schémas d'AniList, donc testable sans en fabriquer un.
 */
export function latestAiredPerMedia<
  T extends { mediaId: number; airingAt: number },
>(schedules: readonly T[], now: Date): Map<number, T> {
  const latest = new Map<number, T>();

  for (const slot of schedules) {
    if (!hasAired(slot.airingAt, now)) continue;

    const known = latest.get(slot.mediaId);
    if (!known || slot.airingAt > known.airingAt)
      latest.set(slot.mediaId, slot);
  }

  return latest;
}
