import "server-only";

import type { ListKind } from "@/features/lists/schemas/lists.schema";
import { visibleListsWhere } from "@/features/lists/server/list-visibility";
import {
  currentUserId,
  type ListCover,
  type ListSummary,
  summarizeLists,
  summarySelect,
} from "@/features/lists/server/lists.queries";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures sociales des listes (lot 3, §3) : la Communauté, et les listes qui contiennent une
 * œuvre. Comme `lists.queries.ts`, jamais de `"use cache"` : tout dépend du lecteur.
 */

/** Une page de la Communauté : trois rangées de trois cartes, à peu près. */
export const COMMUNITY_PAGE_SIZE = 24;

export type CommunitySort = "aimees" | "recentes";

/**
 * Les listes « Membres » des **autres**, non vides (une liste vide n'a rien à faire découvrir).
 *
 * « Voir plus » recharge le cumul (`take` = pages × taille) : c'est un lien, donc une page qu'on
 * peut partager ou rouvrir telle quelle. La ligne de trop dit s'il en reste.
 */
export async function getCommunityLists({
  includeAdult,
  sort,
  page,
}: {
  includeAdult: boolean;
  sort: CommunitySort;
  page: number;
}): Promise<{ lists: ListSummary[]; hasMore: boolean }> {
  const viewerId = await currentUserId();
  const take = page * COMMUNITY_PAGE_SIZE;

  const rows = await prisma.list.findMany({
    where: communityWhere(viewerId),
    orderBy:
      sort === "aimees"
        ? [{ likes: { _count: "desc" } }, { updatedAt: "desc" }]
        : { createdAt: "desc" },
    take: take + 1,
    select: summarySelect(viewerId),
  });

  return {
    lists: await summarizeLists(rows.slice(0, take), {
      viewerId,
      includeAdult,
    }),
    hasMore: rows.length > take,
  };
}

/** Le nombre que porte l'onglet « Communauté ». */
export async function countCommunityLists(): Promise<number> {
  const viewerId = await currentUserId();
  return prisma.list.count({ where: communityWhere(viewerId) });
}

function communityWhere(viewerId: string) {
  return {
    ...visibleListsWhere(viewerId),
    ownerId: { not: viewerId },
    visibility: "MEMBERS" as const,
    items: { some: {} },
  };
}

/** Une liste qui contient l'œuvre, pour le bloc « Dans les listes » de la fiche (maquette D). */
export type MediaListRef = {
  id: string;
  title: string;
  kind: ListKind;
  owner: { name: string; username: string; image: string | null };
  isMine: boolean;
  /** La place de l'œuvre dans un classement ; `null` hors classement. */
  rank: number | null;
  /** Deux jaquettes au plus : la mini-carte n'en dessine pas davantage. */
  covers: ListCover[];
};

/**
 * Les listes **visibles** qui contiennent l'œuvre, les miennes comprises et en tête.
 *
 * Chaque liste rapporte tous ses items, réduits à l'œuvre : c'est ce qui donne d'un coup le rang
 * et les deux jaquettes, sur des listes de quelques dizaines d'œuvres.
 */
export async function getListsWithMedia(
  mediaId: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<MediaListRef[]> {
  const viewerId = await currentUserId();

  const rows = await prisma.list.findMany({
    where: { items: { some: { mediaId } }, ...visibleListsWhere(viewerId) },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      kind: true,
      ownerId: true,
      owner: { select: { name: true, username: true, image: true } },
      items: {
        orderBy: { rank: "asc" },
        select: {
          media: {
            select: {
              id: true,
              isAdult: true,
              coverImage: true,
              titleRomaji: true,
              titleEnglish: true,
            },
          },
        },
      },
    },
  });

  const refs = rows.map((row) => {
    const position = row.items.findIndex(({ media }) => media.id === mediaId);
    return {
      id: row.id,
      title: row.title,
      kind: row.kind,
      owner: row.owner,
      isMine: row.ownerId === viewerId,
      rank: row.kind === "RANKING" && position >= 0 ? position + 1 : null,
      covers: row.items
        .map(({ media }) => media)
        .filter((media) => includeAdult || !media.isAdult)
        .slice(0, 2)
        .map((media) => ({
          mediaId: media.id,
          cover: media.coverImage,
          title: media.titleRomaji ?? media.titleEnglish ?? "",
        })),
    };
  });

  // Les miennes d'abord : c'est d'elles qu'on vient le plus souvent vérifier la place.
  return [
    ...refs.filter((ref) => ref.isMine),
    ...refs.filter((ref) => !ref.isMine),
  ];
}
