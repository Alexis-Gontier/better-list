import "server-only";

import type { Prisma } from "@/generated/prisma/client";

/**
 * Les listes qu'un membre peut voir (D64) : les siennes, et celles des autres en « Membres » tant
 * que leur propriétaire est dans le cercle. **Toute** lecture de listes d'autrui passe ici.
 */
export function visibleListsWhere(viewerId: string): Prisma.ListWhereInput {
  return {
    OR: [
      { ownerId: viewerId },
      { visibility: "MEMBERS", owner: { status: "APPROVED", banned: false } },
    ],
  };
}
