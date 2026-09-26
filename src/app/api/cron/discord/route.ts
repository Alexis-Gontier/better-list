import type { NextRequest } from "next/server";

import { dispatchDiscordEpisodes } from "@/features/notifications/server/discord.dispatch";
import { isAuthorizedCron } from "@/lib/security/cron-auth";

/**
 * Pousse dans Discord les épisodes sortis depuis la dernière passe, pour chaque compte qui a
 * branché un webhook dans `/settings`.
 *
 * **Appelé toutes les heures par GitHub Actions, pas par Vercel** — et c'est une contrainte, pas un
 * goût. Le plan Hobby n'accorde aux crons de `vercel.json` qu'une passe par jour, ce qui ferait
 * d'une notification un récapitulatif du lendemain. `.github/workflows/discord-notifications.yml`
 * appelle donc cette route avec le même `CRON_SECRET` ; la cadence se lit dans ce fichier-là.
 *
 * Le handler ne contient **aucune logique**, comme son voisin `refresh-media` : il garde, il appelle
 * `features/notifications/server/`, il rend compte dans les journaux.
 *
 * `GET` et non `POST` pour la même raison que le cron Vercel : c'est ce qu'il envoie, et les deux
 * portes de `api/cron/` se lisent de la même façon.
 */

/** Une lecture AniList, et un message par compte au plus : dix secondes suffisent rarement à quatre. */
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(await dispatchDiscordEpisodes());
}
