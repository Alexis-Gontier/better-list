import "server-only";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import type { EntryEventView } from "@/features/tracking/lib/entry-format";
import type { EntryState } from "@/features/tracking/lib/entry-transition";
import {
  LIBRARY_STATUS_ORDER,
  type LibraryFilterValues,
  type LibrarySort,
} from "@/features/tracking/lib/library-params";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import type { Prisma } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Lectures du suivi.
 *
 * **Aucun `"use cache"` ici, et c'est la règle, pas un oubli.** Ces lectures dépendent de
 * l'utilisateur connecté : une entrée mémorisée servirait la progression d'un membre à un autre.
 * Le cache de ce projet est réservé aux données AniList, qui sont les mêmes pour tout le monde
 * (`features/media/server/media.queries.ts`).
 *
 * La contrepartie est assumée : la fiche a une coquille statique instantanée, et le panneau de
 * suivi arrive en flux dans son propre `<Suspense>`.
 */

/**
 * Les colonnes qui forment **exactement** `EntryState` (`lib/entry-transition.ts`), ni plus ni
 * moins.
 *
 * L'égalité est une contrainte, pas une commodité. La transition construit son résultat par
 * `{ ...base, ...changements }` et la Server Action réécrit cet objet tel quel : une colonne de plus
 * ici — `id`, `createdAt`, `updatedAt` — repartirait dans le `update`, où elle écraserait la date de
 * modification automatique et rendrait la clé primaire modifiable par accident.
 *
 * Partagé par les quatre lectures qui ont besoin de l'état complet, dont l'écriture : c'est le seul
 * moyen que la liste ne dérive pas d'un appelant à l'autre.
 */
export const ENTRY_STATE_SELECT = {
  status: true,
  progress: true,
  progressVolumes: true,
  score: true,
  favorite: true,
  notes: true,
  repeatCount: true,
  startedAt: true,
  finishedAt: true,
} as const;

/**
 * Le suivi de l'utilisateur courant sur une œuvre, ou `null` s'il n'en a aucun.
 *
 * L'identifiant vient de la session, **jamais d'un argument** : une signature
 * `getEntryForMedia(userId, mediaId)` inviterait tôt ou tard un appelant à passer un id venu de
 * l'URL, et à lire le suivi de quelqu'un d'autre.
 */
export async function getEntryForMedia(mediaId: number) {
  const session = await getSession();
  if (!session) return null;

  return prisma.entry.findUnique({
    where: { userId_mediaId: { userId: session.user.id, mediaId } },
    select: { ...ENTRY_STATE_SELECT, updatedAt: true },
  });
}

/**
 * Les suivis de l'utilisateur courant sur un lot d'œuvres, indexés par `mediaId`.
 *
 * Les grilles du catalogue et de la recherche viennent d'AniList, qui ne sait évidemment pas ce que
 * ce compte suit. Sans cette lecture, une vignette de résultat ne peut proposer que « suivre » — y
 * compris sur une série déjà en cours, où le geste écraserait un statut et une progression. C'est
 * elle qui permet à la même carte de porter « suivre » ou « modifier » selon le cas.
 *
 * **Une requête pour toute la page**, et elle ne part jamais chez AniList : le suivi est chez nous.
 * Le quota de PRODUCT.md §4.1 n'est donc pas concerné, et vingt-quatre vignettes coûtent une lecture
 * indexée sur `(userId, mediaId)` — la clé unique de la table.
 *
 * L'identifiant vient de la session, jamais d'un argument, pour la même raison que
 * `getEntryForMedia` : une signature qui l'accepterait finirait par recevoir un id venu de l'URL.
 */
export async function getEntryStatesFor(mediaIds: number[]) {
  const states = new Map<number, EntryState>();

  // Une grille vide ne pose pas de question à la base. Un `in: []` serait correct mais paierait un
  // aller-retour pour un résultat connu d'avance.
  if (mediaIds.length === 0) return states;

  const session = await getSession();
  if (!session) return states;

  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id, mediaId: { in: mediaIds } },
    select: { mediaId: true, ...ENTRY_STATE_SELECT },
  });

  for (const { mediaId, ...state } of entries) states.set(mediaId, state);

  return states;
}

/**
 * Combien d'événements la fiche affiche.
 *
 * Le panneau de suivi est une colonne collante : une timeline complète le rendrait plus haut que
 * l'écran et casserait le `sticky`. Ce n'est pas une pagination — c'est le format « activité
 * récente ». L'historique entier appartient à la timeline du profil (docs/PRODUCT.md §8.1), qui
 * n'existe pas encore ; tant qu'elle manque, mieux vaut un titre honnête qu'un « voir tout » qui ne
 * mène nulle part.
 */
export const RECENT_EVENTS_COUNT = 8;

/**
 * Le journal d'une œuvre pour l'utilisateur courant, du plus récent au plus ancien.
 *
 * Le filtre porte sur `userId` **de l'événement**, la colonne dupliquée depuis `Entry`
 * (prisma/schema.prisma) : c'est elle qui est indexée avec `createdAt`, et c'est la seule qui rende
 * la lecture close sur son propriétaire sans dépendre d'une jointure pour sa sécurité. Le média,
 * lui, passe par la relation — un `EntryEvent` ne le porte pas.
 *
 * Comme `getEntryForMedia`, l'identifiant vient de la session et jamais d'un argument.
 */
export async function getEntryTimeline(
  mediaId: number,
  take: number = RECENT_EVENTS_COUNT,
): Promise<EntryEventView[]> {
  const session = await getSession();
  if (!session) return [];

  return prisma.entryEvent.findMany({
    where: { userId: session.user.id, entry: { mediaId } },
    /**
     * L'`id` départage les ex æquo. Le cas n'est pas théorique : un « +1 » sur le dernier épisode
     * écrit `PROGRESS` et `STATUS_CHANGED` dans le **même `createMany`**, donc à l'horodatage près.
     * Sur `createdAt` seul, Postgres reste libre de les rendre dans l'ordre qu'il veut, et deux
     * rendus de la même page peuvent se contredire.
     *
     * Le `cuid()` de Prisma (v1) préfixe l'horodatage puis un compteur : son ordre lexicographique
     * est celui de la création. C'est donc un départage juste, et pas seulement stable.
     */
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    select: {
      id: true,
      type: true,
      progressFrom: true,
      progressTo: true,
      statusFrom: true,
      statusTo: true,
      score: true,
      note: true,
      createdAt: true,
    },
  });
}

/**
 * Taille d'une page de bibliothèque — la même que celle du catalogue, et pour la même raison
 * géométrique (`config/catalogue.ts`) : six colonnes au plus large, quatre rangées pleines.
 */
export const LIBRARY_PAGE_SIZE = CATALOGUE_PAGE_SIZE;

/**
 * Le `where` d'une bibliothèque, dérivé des filtres d'URL. Partagé par la page de résultats **et**
 * par les compteurs d'onglets, et c'est le point : un compteur calculé sur un autre périmètre que
 * la grille annoncerait « 12 » au-dessus d'une liste de trois.
 *
 * Le statut en est **volontairement absent** — l'appelant l'ajoute ou non. Les onglets comptent
 * chaque statut sous les autres filtres ; les résultats comptent le statut choisi en plus.
 *
 * La recherche porte sur les trois colonnes de titre du miroir, comme la palette de commandes. Le
 * titre natif se cherche sans `insensitive` : la casse n'existe pas en japonais, et l'insensibilité
 * coûterait un balayage sans rien apporter.
 */
function libraryWhere(
  userId: string,
  { q, type }: Pick<LibraryFilterValues, "q" | "type">,
): Prisma.EntryWhereInput {
  const search = q.trim();

  return {
    userId,
    ...((type || search) && {
      media: {
        ...(type && { type }),
        ...(search && {
          OR: [
            { titleRomaji: { contains: search, mode: "insensitive" } },
            { titleEnglish: { contains: search, mode: "insensitive" } },
            { titleNative: { contains: search } },
          ],
        }),
      },
    }),
  };
}

/**
 * Combien d'œuvres sous chaque statut, **dans le contexte courant**.
 *
 * Un `groupBy` et non six `count` : c'est une seule requête, et elle rend exactement les statuts
 * qui ont au moins une ligne. Les autres valent zéro, ce que l'appelant retrouve sans avoir à les
 * demander.
 *
 * Les compteurs héritent du type et de la recherche mais **jamais du statut** : un onglet doit dire
 * ce qu'on trouverait en cliquant dessus, pas ce qu'on voit déjà. Sans ça, tous les onglets sauf
 * l'actif afficheraient zéro.
 */
export async function getLibraryStatusCounts(
  filters: Pick<LibraryFilterValues, "q" | "type">,
): Promise<{ byStatus: Record<EntryStatus, number>; total: number }> {
  const empty = Object.fromEntries(
    LIBRARY_STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<EntryStatus, number>;

  const session = await getSession();
  if (!session) return { byStatus: empty, total: 0 };

  const groups = await prisma.entry.groupBy({
    by: ["status"],
    where: libraryWhere(session.user.id, filters),
    _count: { _all: true },
  });

  const byStatus = { ...empty };
  let total = 0;

  for (const group of groups) {
    byStatus[group.status] = group._count._all;
    total += group._count._all;
  }

  return { byStatus, total };
}

/**
 * Traductions des tris en `orderBy` Prisma.
 *
 * Chacun se termine par `id`, et ce n'est pas superflu : sans clé de départage, deux entrées de même
 * note — ou de même progression — peuvent changer de place entre deux requêtes, et la pagination
 * se met alors à répéter une œuvre sur la page 2 en en sautant une autre. Le tri par titre passe par
 * la relation ; les valeurs nulles vont à la fin, faute de quoi les œuvres sans titre romaji
 * ouvriraient la liste.
 */
const LIBRARY_ORDER_BY: Record<
  LibrarySort,
  Prisma.EntryOrderByWithRelationInput[]
> = {
  recent: [{ updatedAt: "desc" }, { id: "asc" }],
  title: [
    { media: { titleRomaji: { sort: "asc", nulls: "last" } } },
    { id: "asc" },
  ],
  score: [{ score: { sort: "desc", nulls: "last" } }, { id: "asc" }],
  progress: [{ progress: "desc" }, { id: "asc" }],
};

/**
 * Ma bibliothèque : mes entrées, filtrées et paginées.
 *
 * Tout se lit dans le **miroir local** (docs/PRODUCT.md §4.1) et pas chez AniList : c'est la raison
 * d'être de la table `Media`. Afficher 600 titres en interrogeant l'API serait impossible sous un
 * quota de 30 requêtes par minute, et trier par note ou par année supposerait de toute façon ces
 * champs en base.
 *
 * Comme les autres lectures du domaine, l'identifiant vient de la session et jamais d'un argument.
 */
export async function getLibrary({
  q,
  status,
  type,
  sort,
  page,
}: LibraryFilterValues) {
  const session = await getSession();
  if (!session) {
    return { entries: [], total: 0, currentPage: 1, lastPage: 1 };
  }

  const where: Prisma.EntryWhereInput = {
    ...libraryWhere(session.user.id, { q, type }),
    ...(status && { status }),
  };

  const total = await prisma.entry.count({ where });
  const lastPage = Math.max(1, Math.ceil(total / LIBRARY_PAGE_SIZE));

  /**
   * La page demandée est ramenée dans les bornes plutôt que servie telle quelle. Un `?page=40`
   * forgé, ou laissé par un filtre qui vient de réduire la liste, afficherait sinon une grille
   * vide — que l'utilisateur lirait comme « rien ne correspond ».
   */
  const currentPage = Math.min(Math.max(page, 1), lastPage);

  const entries = await prisma.entry.findMany({
    where,
    orderBy: LIBRARY_ORDER_BY[sort],
    skip: (currentPage - 1) * LIBRARY_PAGE_SIZE,
    take: LIBRARY_PAGE_SIZE,
    select: {
      id: true,
      updatedAt: true,
      /**
       * **L'état complet, et pas seulement ce que la vignette affiche.** Chaque carte porte la
       * fenêtre d'édition du suivi, qui édite les mêmes champs que le panneau de la fiche : sans
       * eux, ouvrir la fenêtre coûterait un aller-retour par carte. Ce sont des colonnes d'une
       * ligne déjà chargée — le surcoût est celui de leur sérialisation, pas d'une requête.
       */
      ...ENTRY_STATE_SELECT,
      media: {
        select: {
          id: true,
          type: true,
          format: true,
          status: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          coverImage: true,
          // Pour l'en-tête de la fenêtre d'édition, qui ouvre sur une bande d'image.
          bannerImage: true,
          episodes: true,
          chapters: true,
          meanScore: true,
          isAdult: true,
          /**
           * Les genres ne servent qu'à la surcouche de survol de la vignette — mais ils sont déjà
           * dans le miroir, donc les lire ne coûte qu'une colonne de tableau déjà chargé. C'est
           * exactement le genre de champ pour lequel la table `Media` existe (docs/PRODUCT.md §4.1)
           * plutôt qu'un aller-retour AniList par affichage.
           */
          genres: true,
          seasonYear: true,
        },
      },
    },
  });

  return { entries, total, currentPage, lastPage };
}

/** Les colonnes du miroir dont la palette de commandes a besoin — un intitulé et un plafond. */
const COMMAND_MEDIA_SELECT = {
  id: true,
  type: true,
  titleRomaji: true,
  titleEnglish: true,
  titleNative: true,
  episodes: true,
  chapters: true,
} as const;

/**
 * Mes entrées les plus pertinentes pour une saisie de la palette de commandes.
 *
 * La saisie vide et la saisie remplie ne posent pas la même question, d'où l'asymétrie :
 *
 * - **vide** → « où j'en suis », donc les séries `CURRENT` de la plus récemment touchée à la plus
 *   ancienne. C'est ce qui permet d'ouvrir la palette et d'avancer d'un épisode sans rien taper.
 * - **remplie** → « trouve-moi ça », donc tous les statuts confondus : chercher une série terminée
 *   pour la retrouver est un usage légitime, et l'exclure serait incompréhensible.
 *
 * La recherche porte sur **les trois colonnes de titre du miroir**, pas sur AniList : c'est une
 * lecture locale, donc gratuite, et c'est exactement ce pour quoi la table `Media` existe
 * (docs/PRODUCT.md §4.1). Le titre natif se cherche sans `insensitive` — la casse n'existe pas en
 * japonais, et l'insensibilité coûterait un balayage sans rien apporter.
 *
 * Comme les autres lectures du domaine, l'identifiant vient de la session et jamais d'un argument.
 */
export async function searchEntries({
  query,
  take,
}: {
  query: string;
  take: number;
}) {
  const session = await getSession();
  if (!session) return [];

  const where: Prisma.EntryWhereInput = query
    ? {
        userId: session.user.id,
        media: {
          OR: [
            { titleRomaji: { contains: query, mode: "insensitive" } },
            { titleEnglish: { contains: query, mode: "insensitive" } },
            { titleNative: { contains: query } },
          ],
        },
      }
    : { userId: session.user.id, status: "CURRENT" };

  return prisma.entry.findMany({
    where,
    // `id` départage, comme partout ailleurs : sans lui, deux entrées touchées à la même seconde
    // peuvent changer de place d'une frappe à l'autre, et la ligne sélectionnée se dérobe.
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take,
    select: {
      status: true,
      progress: true,
      media: { select: COMMAND_MEDIA_SELECT },
    },
  });
}

/**
 * Au-delà de ce délai sans le moindre geste, une série « en cours » ne l'est plus vraiment.
 *
 * Le seuil est un choix de produit, pas une constante technique : trente jours, c'est le moment où
 * l'on ne sait plus où l'on en était. Plus court, le tableau de bord accuserait à tort la moindre
 * semaine de vacances ; plus long, l'écran « à reprendre » (docs/PRODUCT.md §8.4) arriverait après
 * que la série est déjà oubliée.
 */
const STALLED_AFTER_DAYS = 30;

/** Ce que chaque section montre. Assez pour remplir une rangée, pas assez pour noyer la page. */
const DASHBOARD_CURRENT_COUNT = 12;
const DASHBOARD_STALLED_COUNT = 6;

/** Les colonnes du miroir dont les vignettes du tableau de bord ont besoin. */
const DASHBOARD_MEDIA_SELECT = {
  id: true,
  type: true,
  format: true,
  status: true,
  titleRomaji: true,
  titleEnglish: true,
  titleNative: true,
  coverImage: true,
  // Pour l'en-tête de la fenêtre d'édition, qui ouvre sur une bande d'image.
  bannerImage: true,
  episodes: true,
  chapters: true,
  meanScore: true,
  isAdult: true,
} as const;

/**
 * Combien de diapositives le bandeau d'ouverture de l'accueil montre.
 *
 * Cinq, et le nombre est une limite haute plus qu'une cible : un carrousel qu'on ne parcourt pas
 * jusqu'au bout ne sert que sa première vue, et au-delà de cinq points d'ancrage l'indicateur cesse
 * de dire où l'on en est. La rangée « En cours » juste dessous, elle, en montre douze — c'est là
 * qu'on fait le tour, pas ici.
 */
const HERO_COUNT = 5;

/**
 * Les colonnes du bandeau : celles du tableau de bord, plus les genres.
 *
 * Une sélection à part plutôt qu'un `genres: true` ajouté à `DASHBOARD_MEDIA_SELECT`, qui est
 * partagée : le planning s'en sert pour **deux cents** lignes, et un tableau de chaînes rapporté
 * deux cents fois pour n'être jamais lu se paie sur chaque chargement de `/calendar`. Cinq lignes
 * ici, c'est gratuit.
 */
const HERO_MEDIA_SELECT = {
  ...DASHBOARD_MEDIA_SELECT,
  genres: true,
} as const;

/**
 * Ce que le bandeau d'ouverture de l'accueil met en scène : mes séries en cours, en grand.
 *
 * **Une lecture à part de `getDashboard`, et non un `slice` de son résultat.** Les deux vivent dans
 * des frontières de suspension distinctes — le bandeau porte l'image la plus lourde de la page et
 * doit partir seul, sans attendre les listes ni le décompte de la bibliothèque. Partager l'appel
 * obligerait à les réunir, c'est-à-dire à faire attendre le LCP derrière trois requêtes dont il n'a
 * aucun besoin.
 *
 * **`bannerImage` non nulle est une condition, pas une préférence.** C'est un bandeau : une œuvre
 * sans bannière y afficherait un aplat de deux cents pixels de haut sous un titre. AniList en pose
 * une sur la quasi-totalité des animes et sur presque aucun manga, donc la clause ne retire en
 * pratique que ce qu'elle doit retirer. Quand elle ne laisse rien, l'accueil se rabat sur les
 * tendances (`home-hero.tsx`).
 *
 * Pas de fenêtre de trente jours ici, contrairement à « En cours » : une série reprise après deux
 * mois reste la dernière chose qu'on ait regardée, et c'est bien elle qu'on vient continuer.
 */
export async function getHeroEntries() {
  const session = await getSession();
  if (!session) return [];

  return prisma.entry.findMany({
    where: {
      userId: session.user.id,
      status: "CURRENT",
      media: { bannerImage: { not: null } },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: HERO_COUNT,
    select: {
      id: true,
      ...ENTRY_STATE_SELECT,
      media: { select: HERO_MEDIA_SELECT },
    },
  });
}

/**
 * Le suivi tel que l'accueil le montre : ce que je regarde, ce que j'ai laissé en plan.
 *
 * **Un seul `Promise.all`** : ces trois lectures sont indépendantes et toutes locales, les
 * séquencer ajouterait deux allers-retours pour rien.
 *
 * Le journal, lui, a quitté cette fonction quand l'accueil est devenu un melting-pot : il s'affiche
 * désormais **après** les rangées de découverte, donc dans une autre frontière de suspension.
 * Le coût de la séparation est nul — `getSession` porte le `cache` de React, et les deux lectures
 * partent en parallèle puisque les frontières sont sœurs.
 *
 * Les deux sections sont **disjointes par construction** : une série en cours touchée il y a moins
 * de trente jours est « en cours », au-delà elle est « à reprendre ». Sans cette coupure, la même
 * œuvre s'afficherait deux fois sur un écran qui tient en une hauteur de page.
 */
export async function getDashboard() {
  const session = await getSession();
  if (!session) {
    return { current: [], stalled: [], total: 0 };
  }

  const userId = session.user.id;
  const stalledBefore = new Date(
    Date.now() - STALLED_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );

  const [current, stalled, total] = await Promise.all([
    prisma.entry.findMany({
      where: { userId, status: "CURRENT", updatedAt: { gte: stalledBefore } },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: DASHBOARD_CURRENT_COUNT,
      // L'état complet, pour la même raison que la bibliothèque : ces vignettes portent la fenêtre
      // d'édition du suivi.
      //
      // `updatedAt` sert la carte de reprise, qui écrit « vu aujourd'hui » à côté de l'épisode : sur
      // une section qui ne montre que les trente derniers jours, la fraîcheur du geste est ce qui
      // distingue la série qu'on a laissée hier de celle d'il y a trois semaines. C'est la colonne
      // qui trie déjà cette liste — elle ne coûte rien de plus à rapporter.
      select: {
        id: true,
        updatedAt: true,
        ...ENTRY_STATE_SELECT,
        media: { select: DASHBOARD_MEDIA_SELECT },
      },
    }),

    prisma.entry.findMany({
      where: {
        userId,
        OR: [
          { status: "PAUSED" },
          { status: "CURRENT", updatedAt: { lt: stalledBefore } },
        ],
      },
      // Du plus ancien au plus récent : la série qu'on a le plus oubliée est celle qu'il faut
      // remettre sous les yeux en premier.
      orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
      take: DASHBOARD_STALLED_COUNT,
      select: {
        id: true,
        updatedAt: true,
        ...ENTRY_STATE_SELECT,
        media: { select: DASHBOARD_MEDIA_SELECT },
      },
    }),

    prisma.entry.count({ where: { userId } }),
  ]);

  return { current, stalled, total };
}

/**
 * Les statuts qui ont une raison de figurer au planning.
 *
 * `CURRENT` et `REPEATING` vont de soi. `PLANNING` aussi, et c'est le seul qui se discute : savoir
 * qu'une série qu'on s'est promise commence lundi est exactement ce qu'un planning doit dire.
 *
 * `PAUSED` et `DROPPED` en sont **volontairement absents**. Ce sont des séries qu'on a décidé
 * d'arrêter : les remettre chaque semaine sous les yeux transformerait le planning en reproche.
 * L'écran « à reprendre » de l'accueil est fait pour elles, et il compte les mois plutôt que les
 * épisodes (docs/PRODUCT.md §8.4).
 */
const AIRING_STATUSES = ["CURRENT", "PLANNING", "REPEATING"] as const;

/**
 * Combien d'œuvres suivies le planning interroge au plus.
 *
 * Ces ids partent dans `mediaId_in` chez AniList : la borne protège la longueur de la requête et le
 * nombre de pages qu'elle peut ramener. Deux cents séries en cours de diffusion sur un même compte
 * n'existent pas — c'est une ceinture, pas une politique.
 */
const AIRING_MEDIA_LIMIT = 200;

/**
 * Mes œuvres susceptibles d'être diffusées cette semaine.
 *
 * Tout vient du **miroir local** : c'est lui qui porte les jaquettes, les titres et les plafonds
 * (docs/PRODUCT.md §4.1), donc la grille horaire d'AniList n'a plus qu'à répondre « quel épisode, à
 * quelle heure » — et la page ne dépend d'AniList que pour ça.
 *
 * Le filtre sur le statut de l'œuvre est ce qui garde la requête sortante petite : une série
 * terminée n'a pas de diffusion à venir, et l'inclure dépenserait une place d'`id_in` pour rien.
 * **Un statut inconnu (`null`) reste dans le lot**, pour la même raison qu'il est traité comme
 * volatile par le cron de fraîcheur (`media-freshness.ts`) : on ne sait pas ce qu'est l'œuvre, donc
 * l'écarter reviendrait à décider qu'elle ne sort jamais.
 *
 * Comme les autres lectures du domaine, l'identifiant vient de la session et jamais d'un argument.
 */
export async function getAiringEntries() {
  const session = await getSession();
  if (!session) return [];

  return prisma.entry.findMany({
    where: {
      userId: session.user.id,
      status: { in: [...AIRING_STATUSES] },
      media: {
        // Un manga n'a pas de grille horaire chez AniList : `airingSchedules` ne concerne que
        // l'animation.
        type: "ANIME",
        OR: [
          { status: { in: ["RELEASING", "NOT_YET_RELEASED", "HIATUS"] } },
          { status: null },
        ],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: AIRING_MEDIA_LIMIT,
    select: {
      id: true,
      status: true,
      progress: true,
      media: { select: DASHBOARD_MEDIA_SELECT },
    },
  });
}

// Le journal borné de l'accueil vivait ici (`getRecentActivity`). Il est parti avec la section
// « Activité récente » : elle répondait à « qu'est-ce que j'ai fait », question qu'on ne se pose pas
// en ouvrant l'application, et fermait la page par une liste de texte sous six rangées d'images. La
// timeline complète du profil reste servie par `features/profile/`, qui n'a jamais dépendu de cette
// lecture — c'est ce qui permet de la retirer sans rien casser.
