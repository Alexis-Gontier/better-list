import "server-only";

import type { Activity } from "@/features/social/schemas/social.schema";
import { prisma } from "@/lib/db/prisma";

/** Trente lignes : un mois d'activité dans un cercle de dix, et un menu qui reste un menu. */
const ACTIVITY_LIMIT = 30;

/**
 * L'onglet « Activité » de la cloche (lot 3, §4) : mes notifications sociales, les plus récentes en
 * tête, et le nombre de non lues pour la pastille. Le compte arrive de l'appelant, qui a déjà
 * vérifié la session (`api/notifications`).
 */
export async function getActivity(recipientId: string): Promise<Activity> {
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_LIMIT,
      select: {
        id: true,
        type: true,
        listId: true,
        createdAt: true,
        readAt: true,
        list: { select: { title: true } },
        actor: {
          select: {
            name: true,
            image: true,
            // Le fournisseur ne sert qu'aux demandes : le premier compte lié suffit à le nommer.
            accounts: {
              orderBy: { createdAt: "asc" },
              take: 1,
              select: { providerId: true },
            },
          },
        },
      },
    }),
    prisma.notification.count({ where: { recipientId, readAt: null } }),
  ]);

  return {
    unread,
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      actorName: row.actor.name,
      actorImage: row.actor.image,
      listId: row.listId,
      listTitle: row.list?.title ?? null,
      provider:
        row.type === "SIGNUP_PENDING"
          ? (row.actor.accounts[0]?.providerId ?? null)
          : null,
      createdAt: Math.floor(row.createdAt.getTime() / 1000),
      read: row.readAt !== null,
    })),
  };
}
