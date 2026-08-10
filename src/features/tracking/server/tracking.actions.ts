"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  ensureMediaMirror,
  mediaTotalUnits,
} from "@/features/media/server/media.mirror";
import { applyEntryChanges } from "@/features/tracking/lib/entry-transition";
import {
  removeEntrySchema,
  saveEntrySchema,
} from "@/features/tracking/schemas/tracking.schema";
import { ENTRY_STATE_SELECT } from "@/features/tracking/server/tracking.queries";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Mutations du suivi.
 *
 * Ces actions ne décident rien : la transition d'état vit dans `lib/entry-transition.ts`, pure et
 * testée. Ici on ne fait que la brancher sur la base — lire l'existant, appeler la fonction,
 * écrire le résultat et son journal.
 *
 * Trois garde-fous s'appliquent à chaque écriture :
 *
 * - `authActionClient` : une Server Action est un endpoint POST, la garde du layout ne la protège
 *   pas.
 * - `ensureMediaMirror` : l'œuvre doit exister en base avant qu'une clé étrangère y pointe.
 * - Le plafond de progression vient du miroir, pas du client.
 */

/**
 * `AAAA-MM-JJ` → `Date`, à midi UTC.
 *
 * Pas minuit : à minuit UTC, un visiteur à l'ouest de Greenwich verrait sa date reculer d'un jour
 * à l'affichage. Midi laisse douze heures de marge de chaque côté, ce qui couvre tous les fuseaux.
 * La granularité voulue est la journée — l'heure exacte d'un rattrapage n'a aucun sens.
 */
function toDate(value: string | null): Date | null {
  return value === null ? null : new Date(`${value}T12:00:00.000Z`);
}

/**
 * L'état et son journal partent **dans la même transaction**.
 *
 * Sans elle, une panne entre les deux écritures laisserait soit une progression sans trace, soit
 * un journal qui raconte un épisode que l'état ne connaît pas. Le second cas est le pire : la
 * table est append-only, on ne le corrigerait jamais.
 */
export const saveEntry = authActionClient
  .metadata({ actionName: "saveEntry" })
  .inputSchema(saveEntrySchema)
  .action(async ({ parsedInput: { mediaId, ...changes }, ctx }) => {
    const mirrored = await ensureMediaMirror(mediaId);
    if (!mirrored) throw new Error(`Œuvre introuvable : ${mediaId}`);

    const media = await prisma.media.findUniqueOrThrow({
      where: { id: mediaId },
      select: { type: true, episodes: true, chapters: true },
    });

    /**
     * `ENTRY_STATE_SELECT` est **exactement** `EntryState` — le pourquoi est écrit là où il est
     * défini, et c'est la lecture la plus exposée à l'oubli : la transition construit son résultat
     * par `{ ...base, ...changements }`, donc tout champ lu ici ressort dans l'objet écrit.
     */
    const current = await prisma.entry.findUnique({
      where: { userId_mediaId: { userId: ctx.user.id, mediaId } },
      select: ENTRY_STATE_SELECT,
    });

    const { startedAt, finishedAt, ...rest } = changes;

    const { next, events } = applyEntryChanges({
      current,
      input: {
        ...rest,
        // `undefined` doit rester `undefined` : c'est lui qui dit à la transition « je n'ai pas
        // touché à ce champ », et donc de garder son automatisme.
        ...(startedAt !== undefined && { startedAt: toDate(startedAt) }),
        ...(finishedAt !== undefined && { finishedAt: toDate(finishedAt) }),
      },
      total: mediaTotalUnits(media),
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
          data: events.map((event) => ({
            entryId: entry.id,
            // Dupliqué depuis `Entry` à dessein (docs/PRODUCT.md §4.3) : la timeline et le récap
            // annuel se lisent « tous mes événements de 2026 », sans jointure.
            userId: ctx.user.id,
            type: event.type,
            progressFrom: event.progressFrom ?? null,
            progressTo: event.progressTo ?? null,
            statusFrom: event.statusFrom ?? null,
            statusTo: event.statusTo ?? null,
            score: event.score ?? null,
            note: event.note ?? null,
          })),
        });
      }
    });

    /**
     * Trois chemins, parce que la même entrée s'affiche à trois endroits.
     *
     * Le « +1 » se clique désormais depuis la grille du tableau de bord et de la bibliothèque : ne
     * revalider que la fiche laisserait la vignette qu'on vient de faire avancer afficher son
     * ancien compteur. Le tableau de bord est le plus sensible — sa section « en cours » est triée
     * par date de modification, donc un geste en réordonne la grille.
     */
    revalidatePath(routes.media(mediaId));
    revalidatePath(routes.home);
    revalidatePath(routes.library);

    return next;
  });

/**
 * Retire l'œuvre de la bibliothèque.
 *
 * `EntryEvent` part en cascade avec elle : ne plus suivre une œuvre, c'est en effacer la mémoire,
 * pas garder un journal orphelin. La ligne `Media` du miroir, elle, reste — elle est partagée
 * entre les comptes et ne coûte rien.
 */
export const removeEntry = authActionClient
  .metadata({ actionName: "removeEntry" })
  .inputSchema(removeEntrySchema)
  .action(async ({ parsedInput: { mediaId }, ctx }) => {
    await prisma.entry.deleteMany({
      where: { userId: ctx.user.id, mediaId },
    });

    revalidatePath(routes.media(mediaId));
    revalidatePath(routes.home);
    revalidatePath(routes.library);

    return { removed: true };
  });
