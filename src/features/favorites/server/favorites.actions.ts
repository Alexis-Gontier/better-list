"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  type FavoriteTarget,
  setFavoriteSchema,
} from "@/features/favorites/schemas/favorites.schema";
import { ensureMediaMirror } from "@/features/media/server/media.mirror";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/** La page d'où l'on a cliqué : c'est elle qui relit l'état du cœur. */
function targetPath(target: FavoriteTarget): string {
  switch (target.kind) {
    case "MEDIA":
      return routes.media(target.anilistId);
    case "CHARACTER":
      return routes.character(target.anilistId);
    case "STAFF":
      return routes.staff(target.anilistId);
  }
}

/**
 * Mettre en favori, ou retirer.
 *
 * - **L'état voulu, pas une bascule** (`favorites.schema.ts`) : `upsert` quand on ajoute,
 *   `deleteMany` quand on retire — deux gestes identiques laissent la base dans le même état.
 * - **`ensureMediaMirror` avant d'écrire une œuvre**, pour la même raison que les listes :
 *   `Favorite.mediaId` est une clé étrangère vers le miroir, et l'on peut aimer une œuvre que
 *   personne n'a jamais suivie.
 * - **Un personnage ou un staff rafraîchit son instantané** à chaque nouveau like : c'est la seule
 *   occasion qu'on a de rattraper un portrait changé chez AniList.
 */
export const setFavorite = authActionClient
  .metadata({ actionName: "setFavorite" })
  .inputSchema(setFavoriteSchema)
  .action(async ({ parsedInput: { target, favorite }, ctx }) => {
    const userId = ctx.user.id;
    const { kind, anilistId } = target;

    if (!favorite) {
      await prisma.favorite.deleteMany({ where: { userId, kind, anilistId } });
    } else if (target.kind === "MEDIA") {
      await ensureMediaMirror(anilistId);
      await prisma.favorite.upsert({
        where: { userId_kind_anilistId: { userId, kind, anilistId } },
        create: { userId, kind, anilistId, mediaId: anilistId },
        update: {},
      });
    } else {
      const snapshot = { name: target.name, image: target.image };
      await prisma.favorite.upsert({
        where: { userId_kind_anilistId: { userId, kind, anilistId } },
        create: { userId, kind, anilistId, ...snapshot },
        update: snapshot,
      });
    }

    revalidatePath(targetPath(target));
    if (ctx.user.username) revalidatePath(routes.profile(ctx.user.username));

    return { favorite };
  });
