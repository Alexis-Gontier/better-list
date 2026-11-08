"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  revokeSessionSchema,
  unlinkProviderSchema,
} from "@/features/auth/schemas/account.schema";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Délier un fournisseur, déconnecter un appareil (D74).
 *
 * **Par Prisma, pas par `auth.api`** : `unlinkAccount` exige une session ouverte depuis moins d'un
 * jour, ce qu'aucune session d'un an ne satisfait. La garde qu'il apporte n'en est pas une ici —
 * `linkSocial`, lui, ne l'exige pas, et un cookie volé pourrait déjà y attacher un autre compte.
 * Chaque écriture est scopée au compte de `ctx`, jamais à un identifiant reçu seul.
 *
 * Une session révoquée reste lisible jusqu'à cinq minutes sur son appareil : c'est le cache cookie
 * (`cookieCache` dans `server.ts`), le même délai que `auth.api.revokeSession`.
 */

type Outcome = { ok: true } | { ok: false; message: string };

export const unlinkProvider = authActionClient
  .metadata({ actionName: "unlinkProvider" })
  .inputSchema(unlinkProviderSchema)
  .action(async ({ parsedInput, ctx }): Promise<Outcome> => {
    const outcome = await prisma.$transaction(async (tx) => {
      const count = await tx.account.count({ where: { userId: ctx.user.id } });
      // Le dernier fournisseur est la seule porte d'entrée : le délier enfermerait dehors.
      if (count <= 1) return false;
      await tx.account.deleteMany({
        where: { userId: ctx.user.id, providerId: parsedInput.provider },
      });
      return true;
    });

    if (!outcome) {
      return {
        ok: false,
        message: "Liez un autre fournisseur avant de délier le dernier.",
      };
    }
    revalidatePath(routes.settings);
    return { ok: true };
  });

export const revokeSession = authActionClient
  .metadata({ actionName: "revokeSession" })
  .inputSchema(revokeSessionSchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.session.deleteMany({
      where: { id: parsedInput.sessionId, userId: ctx.user.id },
    });
    revalidatePath(routes.settings);
  });

export const revokeOtherSessions = authActionClient
  .metadata({ actionName: "revokeOtherSessions" })
  .action(async ({ ctx }) => {
    const session = await getSession();
    if (!session) return;

    await prisma.session.deleteMany({
      where: { userId: ctx.user.id, id: { not: session.session.id } },
    });
    revalidatePath(routes.settings);
  });
