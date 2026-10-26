import type { NextRequest } from "next/server";

import { mediaFavoriteQuerySchema } from "@/features/favorites/schemas/favorites.schema";
import { isFavorite } from "@/features/favorites/server/favorites.queries";
import { getSession } from "@/lib/auth/session";

/**
 * L'état du cœur pour une œuvre, lu par la fenêtre d'édition rapide d'une vignette (D53).
 *
 * **À l'ouverture de la fenêtre, pas au rendu de la grille**, pour la raison d'`api/lists/membership`
 * : une lecture par carte pour une fenêtre qu'on ouvre une fois sur vingt et une. La fiche, elle, le
 * lit au serveur.
 */
export async function GET(request: NextRequest) {
  // Sa garde est la seule qu'il ait : `api/` n'est couvert ni par le proxy ni par le layout `(app)`.
  const session = await getSession();

  if (session?.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = mediaFavoriteQuerySchema.safeParse({
    mediaId: request.nextUrl.searchParams.get("mediaId"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  return Response.json({
    favorite: await isFavorite("MEDIA", parsed.data.mediaId),
  });
}
