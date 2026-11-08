import "server-only";

import { describeUserAgent } from "@/app/(app)/settings/_lib/user-agent";
import { LOCALE, TIMEZONE } from "@/config/locale";
import { prisma } from "@/lib/db/prisma";

const SIGNED_IN_FORMAT = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIMEZONE,
  dateStyle: "long",
});

/**
 * Les sessions ouvertes du compte, celle de l'appareil courant en tête.
 *
 * **Lues par Prisma et non par `auth.api.listSessions`** : Better Auth n'y répond qu'à une session
 * ouverte depuis moins d'un jour (`freshAge`), et les nôtres durent un an — la liste serait
 * refusée à presque tout le monde. Le jeton ne sort pas d'ici : on révoque par `id`, scopé au
 * compte (`account.actions.ts`).
 *
 * La date affichée est celle de la **connexion** : `updatedAt` n'avance qu'une fois par jour
 * (`updateAge`), une « dernière activité » tirée de lui mentirait de vingt-quatre heures.
 */
export async function getActiveSessions(userId: string, currentId: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { id: true, userAgent: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return sessions
    .map((session) => ({
      id: session.id,
      device: describeUserAgent(session.userAgent),
      signedInAt: SIGNED_IN_FORMAT.format(session.createdAt),
      current: session.id === currentId,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current));
}

export type ActiveSession = Awaited<
  ReturnType<typeof getActiveSessions>
>[number];
