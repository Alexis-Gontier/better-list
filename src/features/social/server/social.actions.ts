"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { forkData, readyNotifiedAtFor } from "@/features/lists/lib/list-fork";
import { visibleListsWhere } from "@/features/lists/server/list-visibility";
import { shouldNotify } from "@/features/social/lib/notification-rules";
import {
  forkListSchema,
  listTargetSchema,
} from "@/features/social/schemas/social.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Les gestes sociaux sur les listes (lot 3, §3 et §4). Chacun écrit sa notification **dans la même
 * transaction** que lui : un like sans son annonce, ou l'inverse, ne doit pas pouvoir exister.
 */

/*
  Une erreur métier se **renvoie** : un `throw` serait réécrit en « Une erreur est survenue » par
  `handleServerError` en production, et le client ne saurait plus dire pourquoi.
*/
const UNAVAILABLE = { status: "unavailable" } as const;

/** La liste d'un autre que je peux voir. Ni la mienne (on ne s'aime pas, on ne se copie pas), ni une cachée. */
function othersVisibleList(listId: string, viewerId: string) {
  return {
    id: listId,
    ownerId: { not: viewerId },
    ...visibleListsWhere(viewerId),
  };
}

export const toggleListLike = authActionClient
  .metadata({ actionName: "toggleListLike" })
  .inputSchema(listTargetSchema)
  .action(async ({ parsedInput: { listId }, ctx }) => {
    const actorId = ctx.user.id;
    const list = await prisma.list.findFirst({
      where: othersVisibleList(listId, actorId),
      select: { ownerId: true },
    });
    if (!list) return UNAVAILABLE;

    const key = { userId_listId: { userId: actorId, listId } };
    const unread = {
      type: "LIST_LIKED" as const,
      actorId,
      listId,
      readAt: null,
    };

    const liked = await prisma.$transaction(async (tx) => {
      if (await tx.listLike.findUnique({ where: key })) {
        await tx.listLike.delete({ where: key });
        // Retirer son like efface l'annonce pas encore lue, pas l'historique déjà vu.
        await tx.notification.deleteMany({ where: unread });
        return false;
      }

      await tx.listLike.create({ data: { userId: actorId, listId } });
      // Un like remis ne double pas une annonce que le propriétaire n'a pas encore lue.
      const pending = await tx.notification.findFirst({
        where: unread,
        select: { id: true },
      });
      if (!pending && shouldNotify({ actorId, recipientId: list.ownerId })) {
        await tx.notification.create({
          data: { ...unread, recipientId: list.ownerId },
        });
      }
      return true;
    });

    revalidatePath(routes.lists.detail(listId));
    return { status: "ok" as const, liked };
  });

/**
 * Copier la liste d'un autre, ou **faire sa version** d'une tier list (`mode: "version"`, §6) :
 * mêmes œuvres et paliers, tout à classer, et la notification `LIST_VERSIONED` à l'auteur.
 */
export const forkList = authActionClient
  .metadata({ actionName: "forkList" })
  .inputSchema(forkListSchema)
  .action(async ({ parsedInput: { listId, mode }, ctx }) => {
    const source = await prisma.list.findFirst({
      where: othersVisibleList(listId, ctx.user.id),
      select: {
        id: true,
        ownerId: true,
        title: true,
        description: true,
        kind: true,
        cutoff: true,
        tiers: true,
        items: {
          orderBy: { rank: "asc" },
          select: {
            mediaId: true,
            rank: true,
            tierIndex: true,
            media: { select: { status: true } },
          },
        },
      },
    });
    // Une version n'a de sens que pour une tier list : ailleurs, il n'y a rien à classer soi-même.
    if (!source || (mode === "version" && source.kind !== "TIER")) {
      return UNAVAILABLE;
    }

    const { list, items } = forkData(source, ctx.user.id, mode);
    const now = new Date();
    const status = new Map(
      source.items.map((i) => [i.mediaId, i.media.status]),
    );

    const id = await prisma.$transaction(async (tx) => {
      const copy = await tx.list.create({ data: list, select: { id: true } });
      // Une liste de plusieurs centaines d'œuvres : un seul `createMany`.
      await tx.listItem.createMany({
        data: items.map((item) => ({
          ...item,
          listId: copy.id,
          readyNotifiedAt: readyNotifiedAtFor(
            status.get(item.mediaId) ?? null,
            now,
          ),
        })),
      });
      await tx.notification.create({
        data: {
          type: mode === "version" ? "LIST_VERSIONED" : "LIST_FORKED",
          actorId: ctx.user.id,
          recipientId: source.ownerId,
          listId,
        },
      });
      return copy.id;
    });

    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(listId));
    return { status: "ok" as const, id };
  });

/** Ouvrir l'onglet « Activité » de la cloche lit tout ce qu'il montre (lot 3, §4). */
export const markNotificationsRead = authActionClient
  .metadata({ actionName: "markNotificationsRead" })
  .action(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { recipientId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
  });
