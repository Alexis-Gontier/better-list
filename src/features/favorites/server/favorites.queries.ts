import "server-only";

import {
  type FavoriteGroups,
  groupFavorites,
} from "@/features/favorites/lib/favorites-groups";
import type { FavoriteKind } from "@/features/favorites/schemas/favorites.schema";
import type { TitleLanguage } from "@/features/preferences/schemas/preferences.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * Les lectures des favoris — **toutes en base**, comme le reste du profil.
 *
 * Aucun `"use cache"`, pour la raison de `profile.queries.ts` : ce qu'on lit dépend du membre
 * regardé, et le filtre 18+ de celui qui regarde.
 */

/** L'état initial du cœur : cette cible est-elle dans **mes** favoris ? */
export async function isFavorite(
  kind: FavoriteKind,
  anilistId: number,
): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    throw new Error(
      "Lecture de favori hors de la garde de `app/(app)/layout.tsx`.",
    );
  }

  const row = await prisma.favorite.findUnique({
    where: {
      userId_kind_anilistId: { userId: session.user.id, kind, anilistId },
    },
    select: { id: true },
  });

  return row !== null;
}

/**
 * Les favoris d'un membre, rangés pour son profil.
 *
 * Le filtre 18+ porte sur le miroir et ne touche que les œuvres : un personnage ou un staff n'a
 * pas de classement adulte chez AniList.
 */
export async function getProfileFavorites({
  userId,
  includeAdult,
  titleLanguage,
}: {
  userId: string;
  includeAdult: boolean;
  titleLanguage: TitleLanguage;
}): Promise<FavoriteGroups> {
  const rows = await prisma.favorite.findMany({
    where: {
      userId,
      ...(includeAdult
        ? {}
        : { OR: [{ kind: { not: "MEDIA" } }, { media: { isAdult: false } }] }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      kind: true,
      anilistId: true,
      name: true,
      image: true,
      media: {
        select: {
          type: true,
          titleRomaji: true,
          titleEnglish: true,
          titleNative: true,
          coverImage: true,
        },
      },
    },
  });

  return groupFavorites(rows, titleLanguage);
}
