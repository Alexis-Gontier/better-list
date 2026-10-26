import type { NextRequest } from "next/server";

import { listMembershipQuerySchema } from "@/features/lists/schemas/lists.schema";
import { getListMembership } from "@/features/lists/server/lists.queries";
import { getSession } from "@/lib/auth/session";

/**
 * Mes listes vues depuis une œuvre, pour la fenêtre d'édition rapide d'une vignette.
 *
 * **Lue à l'ouverture de la fenêtre, pas au rendu de la grille** : la poser sur chaque carte
 * coûterait une lecture par jaquette pour une fenêtre qu'on n'ouvre qu'une fois sur vingt et une.
 * La fiche, elle, n'en a qu'une et la lit au serveur. Un route handler et pas une action : c'est une
 * lecture demandée par un composant client (CLAUDE.md).
 */
export async function GET(request: NextRequest) {
  // Sa garde est la seule qu'il ait : `api/` n'est couvert ni par le proxy ni par le layout `(app)`.
  const session = await getSession();

  if (session?.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = listMembershipQuerySchema.safeParse({
    mediaId: request.nextUrl.searchParams.get("mediaId"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Invalid query" }, { status: 400 });
  }

  return Response.json(await getListMembership(parsed.data.mediaId));
}
