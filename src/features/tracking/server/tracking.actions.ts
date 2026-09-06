"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { ensureMediaMirror } from "@/features/media/server/media.mirror";
import { applyEntryChanges } from "@/features/tracking/lib/entry-transition";
import {
  removeEntrySchema,
  saveEntrySchema,
} from "@/features/tracking/schemas/tracking.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * **La première Server Action du dépôt.** Jusqu'ici, rien n'écrivait : la barre de la fiche et la
 * fenêtre des vignettes étaient des coquilles dont l'état disparaissait au rechargement, ce que
 * `docs/STATE.md` signalait comme l'écart le plus visible du chantier.
 *
 * Elle a attendu que la mise en page soit validée, et **c'est ce qui lui permet d'être courte** :
 * tout ce qu'elle fait a été écrit et testé avant elle. Elle ne décide de rien.
 *
 * - `saveEntrySchema` valide l'entrée (`tracking.schema.ts`) ;
 * - `applyEntryChanges` décide de ce que devient l'entrée et de ce qui part au journal
 *   (`entry-transition.ts`, 30 tests) ;
 * - `authActionClient` garantit la session et le statut `APPROVED` (`lib/safe-action.ts`).
 *
 * **La garde du layout `(app)` ne protège pas une Server Action** : c'est un endpoint POST à part
 * entière, appelable directement, sans jamais passer par le rendu d'une page. D'où
 * `authActionClient` plutôt que `actionClient`, et l'utilisateur pris dans `ctx` plutôt que relu —
 * ce qui rend l'oubli impossible plutôt qu'improbable.
 *
 * next-safe-action est en **v8** : `.metadata()` puis `.inputSchema()`. `.schema()` est l'API v7 et
 * n'existe plus (CLAUDE.md).
 */

/**
 * Le plafond de progression, **relu du miroir et jamais reçu du client**.
 *
 * « épisode 900 » sur une série de douze est une saisie erronée ou forgée, et dans les deux cas
 * `applyEntryChanges` doit la ramener au réel. Le client passe déjà un total à son pas de
 * progression, mais ce n'est qu'un confort d'affichage : il vient d'un rendu qui peut dater, et
 * surtout d'un endroit où n'importe qui peut écrire ce qu'il veut.
 *
 * `null` quand l'œuvre est absente du miroir ou que son total est inconnu — une série en cours de
 * diffusion n'en a pas —, et la transition sait déjà ne pas plafonner dans ce cas.
 */
async function ceilingFor(mediaId: number): Promise<number | null> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { type: true, episodes: true, chapters: true },
  });

  if (!media) return null;
  return media.type === "ANIME" ? media.episodes : media.chapters;
}

/**
 * Les écrans que ce geste périme.
 *
 * Les trois affichent le suivi : la fiche le montre en entier, `/library` par sa pastille et ses
 * décomptes, `/search` par la pastille de ses résultats. Un « +1 » qui ne rafraîchirait que la page
 * courante laisserait les deux autres mentir jusqu'au prochain rechargement complet.
 *
 * `revalidatePath` et pas `revalidateTag` : ces lectures ne sont pas mémorisées — elles dépendent
 * du visiteur et n'ont donc aucun `"use cache"` à invalider (`library.queries.ts`). Ce qu'on purge
 * ici est le cache **client** du routeur, celui qui garde une page déjà visitée.
 *
 * La fiche est purgée par son chemin exact plutôt qu'en `"layout"` : seule celle de cette œuvre
 * change, et invalider `/media/[id]` en entier jetterait les autres pour rien.
 */
function revalidateTracking(mediaId: number) {
  revalidatePath(routes.media(mediaId));
  revalidatePath(routes.library);
  revalidatePath(routes.search);
}

/**
 * Enregistrer une modification du suivi — **ce qui a changé, jamais l'état complet**.
 *
 * Tous les champs du schéma sont optionnels, et c'est l'invariant du §4.2 : `undefined` veut dire
 * « je n'y touche pas, garde ton automatisme », là où `null` veut dire « efface ». Les confondre
 * ferait effacer toute date posée automatiquement au premier clic sur un bouton voisin.
 *
 * **L'écriture de l'entrée et celle du journal sont dans la même transaction.** `EntryEvent` est la
 * raison d'être du produit (§4.3) et il est *append-only* et non rétroactif : ce qui n'est pas
 * journalisé le jour même est perdu pour toujours. Une entrée mise à jour dont l'événement n'a pas
 * été inséré est donc un trou qu'aucune reprise ne comble — les deux passent ensemble ou aucune ne
 * passe.
 *
 * `upsert` plutôt qu'un `findUnique` suivi d'un `create` ou d'un `update` : le premier geste sur une
 * œuvre crée l'entrée, et deux onglets qui le font en même temps se disputeraient la contrainte
 * d'unicité.
 */
export const saveEntry = authActionClient
  .metadata({ actionName: "saveEntry" })
  .inputSchema(saveEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    const { mediaId, startedAt, finishedAt, ...rest } = parsedInput;

    /*
      **Le miroir d'abord, et pas en parallèle du reste.** `Entry.mediaId` porte une clé étrangère
      vers `Media` : suivre depuis `/search` une œuvre que personne n'a jamais croisée échouerait
      au niveau de la base. `ensureMediaMirror` ne réécrit rien quand la ligne existe et n'est pas
      périmée — sans ce garde-fou, chaque « +1 » recopierait dix-huit colonnes du catalogue partagé
      pour incrémenter un compteur personnel (docs/PRODUCT.md §4.1).

      C'est aussi lui qui garantit que `ceilingFor` trouve un plafond juste après : les deux
      lectures qui suivent dépendent donc de celle-ci, et ne peuvent pas partir avec elle.
    */
    await ensureMediaMirror(mediaId);

    const [current, total] = await Promise.all([
      prisma.entry.findUnique({
        where: { userId_mediaId: { userId: ctx.user.id, mediaId } },
        select: {
          status: true,
          progress: true,
          progressVolumes: true,
          score: true,
          favorite: true,
          notes: true,
          repeatCount: true,
          startedAt: true,
          finishedAt: true,
        },
      }),
      ceilingFor(mediaId),
    ]);

    const { next, events } = applyEntryChanges({
      current,
      input: {
        ...rest,
        /*
          Les dates arrivent en `AAAA-MM-JJ` — ce que produit un `<input type="date">` — et la
          transition ne raisonne que sur des `Date`. **Midi UTC et pas minuit** : à minuit, n'importe
          quel fuseau à l'ouest fait basculer la date affichée sur la veille, et la date qu'on relit
          n'est plus celle qu'on a saisie.

          `undefined` traverse intact, parce que c'est lui qui porte « je n'y touche pas ».
        */
        ...(startedAt !== undefined && { startedAt: toNoonUtc(startedAt) }),
        ...(finishedAt !== undefined && { finishedAt: toNoonUtc(finishedAt) }),
      },
      total,
      /*
        L'horloge est lue **ici et une seule fois**, puis passée à la transition, qui reste pure et
        donc testable. C'est aussi ce qui garantit qu'une entrée et ses événements portent le même
        instant plutôt que trois instants à quelques millisecondes d'écart.
      */
      now: new Date(),
    });

    await prisma.$transaction(async (tx) => {
      const entry = await tx.entry.upsert({
        where: { userId_mediaId: { userId: ctx.user.id, mediaId } },
        create: { userId: ctx.user.id, mediaId, ...next },
        update: next,
        select: { id: true },
      });

      if (events.length > 0) {
        await tx.entryEvent.createMany({
          /*
            `userId` est **dupliqué depuis `Entry` à dessein**, et le schéma le dit : la timeline et
            le récap annuel se lisent « tous mes événements de 2026, par date », et sans cette
            colonne chaque lecture imposerait une jointure. Il faut donc l'écrire ici — l'oublier
            n'aurait pas cassé l'écriture, seulement rendu ces deux écrans impossibles à servir.
          */
          data: events.map((event) => ({
            ...event,
            entryId: entry.id,
            userId: ctx.user.id,
          })),
        });
      }
    });

    revalidateTracking(mediaId);

    return { status: next.status, progress: next.progress, score: next.score };
  });

/**
 * Retirer une œuvre de ma bibliothèque — **et son journal avec elle**.
 *
 * `EntryEvent` porte `onDelete: Cascade` vers `Entry` (prisma/schema.prisma) : la suppression
 * emporte donc l'historique, ce qui est irréversible et non rétroactif. C'est exactement pourquoi
 * l'appelant doit demander confirmation par `alert-dialog` — la note en est portée depuis le
 * 6 septembre dans docs/STATE.md et docs/fiche-media.md §2.1.
 *
 * `deleteMany` et non `delete` : supprimer deux fois la même entrée — deux onglets, un double clic —
 * ne doit pas produire une erreur serveur. `deleteMany` sur une ligne absente ne fait rien, ce qui
 * est le bon résultat pour une action dont le but est qu'elle n'existe plus.
 */
export const removeEntry = authActionClient
  .metadata({ actionName: "removeEntry" })
  .inputSchema(removeEntrySchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.entry.deleteMany({
      where: { userId: ctx.user.id, mediaId: parsedInput.mediaId },
    });

    revalidateTracking(parsedInput.mediaId);

    return { removed: true };
  });

/**
 * `AAAA-MM-JJ` → `Date` à **midi UTC**.
 *
 * Le choix de midi est celui d'`entry-draft.ts`, qui relit ces dates dans l'autre sens : à minuit,
 * un fuseau à l'ouest affiche la veille, et l'aller-retour saisie → base → champ ne rend plus la
 * même journée. Midi laisse douze heures de marge de chaque côté, ce qui couvre tous les fuseaux
 * habités.
 *
 * `null` traverse : c'est un effacement voulu, distinct d'`undefined` qui veut dire « n'y touche
 * pas ».
 */
function toNoonUtc(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T12:00:00.000Z`);
}
