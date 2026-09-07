import "server-only";

import type { EntryEventView } from "@/features/tracking/lib/entry-format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/**
 * La lecture du journal — **le premier lecteur qu'`EntryEvent` ait jamais eu.**
 *
 * La table s'écrit depuis le 6 septembre 2026 (`tracking.actions.ts`) et personne ne l'avait
 * relue : chaque jour sans cet écran était un jour où l'on ne savait pas si ce qui s'enregistre est
 * juste. C'est la raison pour laquelle `docs/STATE.md` en faisait le prochain pas le plus urgent.
 *
 * **Fichier à part de `library.queries.ts`, qui frôle les 430 lignes.** Ces deux-là ne répondent
 * pas à la même question : l'une dit où j'en suis, l'autre ce qui s'est passé. Elles partagent la
 * même table et rien d'autre.
 *
 * **Aucun `"use cache"`, et ce n'est pas un oubli** — la règle de `library.queries.ts` vaut ici
 * mot pour mot : tout y dépend du visiteur, et une entrée mémorisée servirait la mémoire d'un
 * compte à un autre. Le journal est par ailleurs ce qui bouge le plus souvent du produit, puisque
 * chaque geste de suivi y ajoute une ligne.
 */

/**
 * Le compte courant, pour un écran qui vit **sous la garde du layout**.
 *
 * Recopié de `library.queries.ts` plutôt que partagé, et pour la raison que ce fichier y donne :
 * chacune de ces fonctions est appelée une fois par rendu, donc les mémoriser coûterait plus que
 * leur absence. Arriver ici sans session est un défaut de câblage — une route sortie du groupe
 * `(app)` —, pas un cas d'usage : renvoyer un journal vide le masquerait le jour où il compte.
 */
async function currentUserId(): Promise<string> {
  const session = await getSession();

  if (!session) {
    throw new Error(
      "Lecture du journal hors de la garde de `app/(app)/layout.tsx`.",
    );
  }

  return session.user.id;
}

/**
 * Le plafond de lignes remontées par la fiche.
 *
 * `EntryEvent` est *append-only* : rien n'en sort jamais, et le journal d'une série longue suivie
 * chapitre par chapitre grossit indéfiniment. Une lecture sans borne est donc une page qui
 * ralentit un an après, sans que rien n'ait changé dans le code.
 *
 * Deux cents lignes couvrent très largement une œuvre — c'est un geste par jour pendant plus de
 * six mois. Le jour où il faudra dépasser ça, ce sera une pagination, pas un plafond plus haut :
 * personne ne relit trois cents lignes d'affilée.
 */
const JOURNAL_PAGE_SIZE = 200;

/**
 * Ce que le journal de **cette** œuvre a enregistré, du plus récent au plus ancien.
 *
 * **Le filtre part de l'entrée, pas du média.** `EntryEvent` n'a pas de `mediaId` — il pend à une
 * `Entry`, qui porte la contrainte d'unicité `(userId, mediaId)`. Passer par la relation laisse
 * donc Postgres résoudre l'entrée par sa clé unique, puis balayer l'index `[entryId, createdAt]`
 * pour l'ordre : le tri est gratuit, et c'est exactement l'index posé pour cette question.
 *
 * `userId` est **redit dans le `where`** alors que la relation le contraint déjà. Ce n'est pas
 * redondant par distraction : la colonne est dupliquée sur `EntryEvent` à dessein (le schéma le
 * dit), et la nommer ici garantit qu'une entrée mal rattachée ne puisse jamais faire remonter la
 * mémoire d'un autre compte. Une garde qui ne coûte rien vaut d'être écrite.
 *
 * Le tableau vide est une **réponse**, pas une absence : il veut dire « rien ne s'est encore passé
 * ici », et c'est l'état normal de toute œuvre suivie avant le 6 septembre 2026. C'est à l'écran de
 * le dire, pas à cette fonction de le déguiser.
 */
export async function getEntryJournal(
  mediaId: number,
): Promise<EntryEventView[]> {
  const userId = await currentUserId();

  return prisma.entryEvent.findMany({
    where: { userId, entry: { userId, mediaId } },
    orderBy: { createdAt: "desc" },
    take: JOURNAL_PAGE_SIZE,
    /*
      La sélection est **exactement** `EntryEventView`, le type que `entry-format.ts` déclare à la
      main pour traverser la frontière server/client. Remonter la ligne entière ferait voyager
      `entryId` et `userId` jusqu'au navigateur pour un affichage qui n'en fait rien.
    */
    select: {
      id: true,
      type: true,
      progressFrom: true,
      progressTo: true,
      statusFrom: true,
      statusTo: true,
      score: true,
      note: true,
      createdAt: true,
    },
  });
}
