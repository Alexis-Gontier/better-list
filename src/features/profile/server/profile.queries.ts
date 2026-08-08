import "server-only";

import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Lectures du profil d'un membre (docs/PRODUCT.md §5, V1).
 *
 * Le profil est la **vue publique d'un membre au sein du cercle** : il compose des données de
 * comptes et de suivi sans appartenir à ni l'un ni l'autre. D'où sa propre feature, là où ses
 * composants restent dans le `_components/` de la route — ils ne servent qu'à elle.
 *
 * Aucun `"use cache"`, comme partout où l'on lit des données d'utilisateur.
 *
 * **La règle de visibilité tient en une ligne** : profils et bibliothèques sont visibles entre
 * membres (§7), sauf les entrées marquées `private`, qui n'appartiennent qu'à leur auteur. Elle est
 * appliquée par `visibilityFilter` ci-dessous, et par lui seul — une exception oubliée dans une
 * requête publierait le suivi de quelqu'un d'autre.
 */

/** Assez pour une session de lecture, sans faire de la page un mur de texte. */
export const PROFILE_TIMELINE_PAGE_SIZE = 30;

/**
 * Ce que le visiteur a le droit de voir des entrées de la personne consultée.
 *
 * Chez soi, tout ; chez les autres, ce qui n'est pas privé. Le filtre porte sur `Entry` et vaut
 * donc aussi pour le journal, dont chaque événement remonte à une entrée.
 */
function visibilityFilter(isSelf: boolean): Prisma.EntryWhereInput {
  return isSelf ? {} : { private: false };
}

/**
 * Le membre derrière un `username`, ou `null`.
 *
 * `cache` de React déduplique l'appel sur un même rendu : `generateMetadata` et la page demandent
 * le même profil, et une seule requête part.
 *
 * **Un compte non approuvé n'a pas de profil.** Une inscription en liste d'attente (§7.1) crée une
 * ligne `user` avant tout droit d'accès ; lui donner une page publique reviendrait à confirmer
 * l'existence d'un compte que personne n'a encore validé.
 */
export const getProfile = cache(async (username: string) => {
  return prisma.user.findFirst({
    where: { username, status: "APPROVED" },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      createdAt: true,
    },
  });
});

/**
 * Les chiffres du profil : combien d'œuvres, dans quel état, et combien d'épisodes derrière soi.
 *
 * `groupBy` plutôt que six `count` : une seule requête, et l'ajout d'un statut à l'énumération ne
 * demandera pas d'en écrire une septième.
 *
 * Les épisodes et les chapitres sont **comptés séparément** parce qu'ils ne s'additionnent pas :
 * « 400 » n'a aucun sens s'il mélange 300 chapitres lus et 100 épisodes vus.
 */
export async function getProfileStats({
  userId,
  isSelf,
}: {
  userId: string;
  isSelf: boolean;
}) {
  const where: Prisma.EntryWhereInput = {
    userId,
    ...visibilityFilter(isSelf),
  };

  const [byStatus, anime, manga, score] = await Promise.all([
    prisma.entry.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),

    prisma.entry.aggregate({
      where: { ...where, media: { type: "ANIME" } },
      _sum: { progress: true },
      _count: { _all: true },
    }),

    prisma.entry.aggregate({
      where: { ...where, media: { type: "MANGA" } },
      _sum: { progress: true },
      _count: { _all: true },
    }),

    // La moyenne ignore les entrées non notées : `_avg` de Prisma exclut les `null`, ce qui est le
    // comportement voulu — « pas encore noté » n'est pas un zéro (§4.2).
    prisma.entry.aggregate({ where, _avg: { score: true } }),
  ]);

  return {
    byStatus: Object.fromEntries(
      byStatus.map((row) => [row.status, row._count._all]),
    ),
    total: anime._count._all + manga._count._all,
    episodes: anime._sum.progress ?? 0,
    chapters: manga._sum.progress ?? 0,
    averageScore: score._avg.score,
  };
}

/**
 * La timeline complète — le journal de toutes les œuvres, paginé.
 *
 * C'est la lecture que `EntryEvent` attendait depuis le premier jour (docs/PRODUCT.md §4.3) : la
 * fiche n'en montre que les huit dernières lignes d'une œuvre, le tableau de bord les douze
 * dernières toutes œuvres confondues. Ici, tout, du plus récent au plus ancien.
 *
 * L'`id` départage les événements d'un même horodatage — deux lignes nées du même geste, comme un
 * « +1 » qui termine une série. Sans lui, la pagination pourrait répéter une ligne d'une page à
 * l'autre en en sautant une autre.
 */
export async function getProfileTimeline({
  userId,
  isSelf,
  page,
}: {
  userId: string;
  isSelf: boolean;
  page: number;
}) {
  const where: Prisma.EntryEventWhereInput = {
    userId,
    ...(isSelf ? {} : { entry: { private: false } }),
  };

  const total = await prisma.entryEvent.count({ where });
  const lastPage = Math.max(1, Math.ceil(total / PROFILE_TIMELINE_PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), lastPage);

  const events = await prisma.entryEvent.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * PROFILE_TIMELINE_PAGE_SIZE,
    take: PROFILE_TIMELINE_PAGE_SIZE,
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
  });

  return { events, total, currentPage, lastPage };
}
