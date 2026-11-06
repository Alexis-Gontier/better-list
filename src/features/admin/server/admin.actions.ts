"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { routes } from "@/config/routes";
import { banExpiresIn } from "@/features/admin/lib/ban-duration";
import {
  banMemberSchema,
  memberIdSchema,
  setMemberRoleSchema,
  setUsersStatusSchema,
} from "@/features/admin/schemas/admin.schema";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db/prisma";
import { adminActionClient } from "@/lib/safe-action";

/**
 * Approuver, refuser, et **annuler** (retour à `PENDING`, le bouton du toast). Le statut n'est pas
 * un champ du plugin `admin` : il s'écrit directement, et jamais sur son propre compte.
 */
export const setUsersStatus = adminActionClient
  .metadata({ actionName: "setUsersStatus" })
  .inputSchema(setUsersStatusSchema)
  .action(async ({ parsedInput: { userIds, status }, ctx }) => {
    await prisma.user.updateMany({
      where: { id: { in: userIds.filter((id) => id !== ctx.user.id) } },
      data: { status },
    });
    // Une demande tranchée n'attend plus personne : lue chez tous les administrateurs (lot 3, §4).
    if (status !== "PENDING") {
      await prisma.notification.updateMany({
        where: {
          type: "SIGNUP_PENDING",
          actorId: { in: userIds },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }
    revalidatePath(routes.admin.users);
  });

/** Bannir coupe aussi les sessions : c'est Better Auth qui s'en charge. */
export const banMember = adminActionClient
  .metadata({ actionName: "banMember" })
  .inputSchema(banMemberSchema)
  .action(async ({ parsedInput: { userId, reason, duration }, ctx }) => {
    if (userId === ctx.user.id) {
      throw new Error("On ne se bannit pas soi-même.");
    }

    await auth.api.banUser({
      headers: await headers(),
      body: {
        userId,
        banReason: reason || undefined,
        banExpiresIn: banExpiresIn(duration),
      },
    });
    revalidatePath(routes.admin.users);
  });

export const unbanMember = adminActionClient
  .metadata({ actionName: "unbanMember" })
  .inputSchema(memberIdSchema)
  .action(async ({ parsedInput: { userId } }) => {
    await auth.api.unbanUser({ headers: await headers(), body: { userId } });
    revalidatePath(routes.admin.users);
  });

export const setMemberRole = adminActionClient
  .metadata({ actionName: "setMemberRole" })
  .inputSchema(setMemberRoleSchema)
  .action(async ({ parsedInput: { userId, role }, ctx }) => {
    if (userId === ctx.user.id) {
      throw new Error("On ne change pas son propre rôle.");
    }

    await auth.api.setRole({
      headers: await headers(),
      body: { userId, role },
    });
    revalidatePath(routes.admin.users);
  });
