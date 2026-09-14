import { getEpisodeNotifications } from "@/features/tracking/server/notifications.queries";
import { getSession } from "@/lib/auth/session";

/**
 * Ce que la cloche de l'en-tête va chercher au montage.
 *
 * **Un route handler et pas une Server Action**, comme `api/search` d'à côté : c'est une lecture
 * demandée par un composant client, et la règle du dépôt ne laisse pas le choix (CLAUDE.md). Elle a
 * ici une seconde raison — une action est un POST, donc non mémorisable par le navigateur et
 * non annulable, pour une réponse qui ne dépend que de l'heure.
 *
 * Le handler ne contient **aucune logique** : il garde, il appelle `features/tracking/server/`.
 * Pas de validation d'entrée, parce qu'il n'y a pas d'entrée — la question est entièrement portée
 * par la session et par l'instant.
 */
export async function GET() {
  /*
    **Sa garde est la seule qu'il ait.** `src/proxy.ts` exclut `api/` en entier et ce fichier ne vit
    pas sous le layout `(app)` : `requireApprovedUser()` ne le couvre pas. Et elle ne redirige pas —
    un `fetch` qui suivrait une redirection vers `/login` recevrait du HTML là où il attend du JSON.

    Le compte doit être **approuvé**, pas seulement connecté : un compte en liste d'attente n'a pas
    accès au catalogue, et le quota AniList qu'il dépenserait est celui du cercle.
  */
  const session = await getSession();

  if (session?.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json(await getEpisodeNotifications());
}
