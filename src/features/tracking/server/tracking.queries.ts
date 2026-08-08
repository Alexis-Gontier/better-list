import "server-only";

import type { EntryEventView } from "@/features/tracking/lib/entry-format";
import type {
  LibraryFilterValues,
  LibrarySort,
} from "@/features/tracking/lib/library-params";
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
    select: {
      status: true,
      progress: true,
      progressVolumes: true,
      score: true,
      favorite: true,
      notes: true,
      repeatCount: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
    },
  });
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
 * Taille d'une page de bibliothèque. Six colonnes au plus large, quatre rangées : une page pleine
 * remplit l'écran sans le dépasser de beaucoup.
 */
export const LIBRARY_PAGE_SIZE = 24;

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
    userId: session.user.id,
    ...(status && { status }),
    ...(type && { media: { type } }),
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
      status: true,
      progress: true,
      score: true,
      favorite: true,
      updatedAt: true,
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
          episodes: true,
          chapters: true,
          meanScore: true,
          isAdult: true,
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
const DASHBOARD_ACTIVITY_COUNT = 12;

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
  episodes: true,
  chapters: true,
  meanScore: true,
  isAdult: true,
} as const;

/**
 * Le tableau de bord : ce que je regarde, ce que j'ai laissé en plan, ce que j'ai fait récemment.
 *
 * **Une seule fonction et un seul `Promise.all`**, là où la bibliothèque n'en demandait qu'un. Ces
 * quatre lectures sont indépendantes et toutes locales ; les séquencer ajouterait trois allers-
 * retours pour rien, et les éclater en trois composants suspendus ferait relire la session trois
 * fois.
 *
 * Les deux premières sections sont **disjointes par construction** : une série en cours touchée il
 * y a moins de trente jours est « en cours », au-delà elle est « à reprendre ». Sans cette coupure,
 * la même œuvre s'afficherait deux fois sur un écran qui tient en une hauteur de page.
 */
export async function getDashboard() {
  const session = await getSession();
  if (!session) {
    return { current: [], stalled: [], activity: [], total: 0 };
  }

  const userId = session.user.id;
  const stalledBefore = new Date(
    Date.now() - STALLED_AFTER_DAYS * 24 * 60 * 60 * 1000,
  );

  const [current, stalled, activity, total] = await Promise.all([
    prisma.entry.findMany({
      where: { userId, status: "CURRENT", updatedAt: { gte: stalledBefore } },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: DASHBOARD_CURRENT_COUNT,
      select: {
        id: true,
        status: true,
        progress: true,
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
        status: true,
        progress: true,
        updatedAt: true,
        media: { select: DASHBOARD_MEDIA_SELECT },
      },
    }),

    /**
     * Le journal de **toutes** les œuvres — la lecture que l'index `[userId, createdAt]` de
     * `EntryEvent` attendait (prisma/schema.prisma). C'est aussi le brouillon de la timeline du
     * profil : même requête, sans le `take`.
     */
    prisma.entryEvent.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: DASHBOARD_ACTIVITY_COUNT,
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
        entry: {
          select: {
            media: {
              select: {
                id: true,
                type: true,
                titleRomaji: true,
                titleEnglish: true,
                titleNative: true,
              },
            },
          },
        },
      },
    }),

    prisma.entry.count({ where: { userId } }),
  ]);

  return { current, stalled, activity, total };
}
