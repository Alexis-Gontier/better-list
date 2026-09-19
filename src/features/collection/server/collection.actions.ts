"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  setEditionVolumesTotalSchema,
  setOwnedRangeSchema,
} from "@/features/collection/schemas/collection.schema";
import { DEFAULT_EDITION_LABEL } from "@/features/collection/server/collection.queries";
import { ensureMediaMirror } from "@/features/media/server/media.mirror";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Les écritures de l'étagère physique (docs/PRODUCT.md §4.5).
 *
 * Deux gestes, et deux seulement : poser ou retirer une plage de tomes, et corriger le nombre de
 * tomes d'une édition. C'est tout ce que l'écran offre, et c'est délibéré — prix, date
 * d'acquisition, état et prêt ont été retirés du produit le 19 septembre 2026.
 *
 * **La garde du layout `(app)` ne protège pas une Server Action** : c'est un endpoint POST à part
 * entière, appelable directement. D'où `authActionClient`, et l'utilisateur pris dans `ctx`.
 *
 * next-safe-action est en **v8** : `.metadata()` puis `.inputSchema()`.
 */

/**
 * Les écrans que ces gestes périment.
 *
 * `revalidatePath` et pas `revalidateTag` : `collection.queries.ts` ne mémorise rien — tout y
 * dépend du visiteur —, donc il n'y a aucune entrée de cache à invalider. Ce qu'on purge est le
 * cache **client** du routeur, celui qui garde une page déjà visitée.
 *
 * La racine en fait partie autant que la série : cocher un tome change le compteur de la rangée,
 * la phrase des manquants, les quatre chiffres de l'en-tête et, quand c'était le dernier trou, la
 * répartition des trois onglets.
 */
function revalidateCollection(mediaId: number) {
  revalidatePath(routes.collection.detail(mediaId));
  revalidatePath(routes.collection.root);
}

/**
 * L'édition sur laquelle on écrit, **créée en silence si elle n'existe pas** (§4.5).
 *
 * C'est la promesse « on n'a rien à remplir dans le cas courant » tenue au niveau de la base : le
 * premier tome coché sur une série fabrique son édition par défaut, sans qu'aucun écran n'ait
 * demandé un libellé ni un éditeur.
 *
 * `upsert` sur `(mediaId, label)` plutôt qu'un `findFirst` suivi d'un `create` : `Edition` est
 * **partagée entre les comptes**, donc deux membres qui commencent la même série la même minute
 * se disputeraient la contrainte d'unicité. L'`upsert` les fait tomber sur la même ligne, ce qui
 * est exactement l'intention du modèle partagé.
 *
 * `volumesTotal` est semé depuis le miroir quand AniList le connaît — il ne le donne que pour les
 * séries terminées, et sans notion d'édition (§9). C'est une **proposition**, pas une vérité : le
 * menu de l'en-tête existe pour la corriger.
 */
async function defaultEditionId(mediaId: number): Promise<string> {
  const existing = await prisma.edition.findFirst({
    where: { mediaId },
    select: { id: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (existing) return existing.id;

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { volumes: true },
  });

  const edition = await prisma.edition.upsert({
    where: { mediaId_label: { mediaId, label: DEFAULT_EDITION_LABEL } },
    create: {
      mediaId,
      label: DEFAULT_EDITION_LABEL,
      volumesTotal: media?.volumes ?? null,
      isDefault: true,
    },
    update: {},
    select: { id: true },
  });

  return edition.id;
}

/**
 * Poser ou retirer une plage de tomes — **le geste de l'étagère.**
 *
 * Un clic sur une case envoie `from === to`, un glissé envoie les deux bornes : c'est le même
 * appel, et c'est ce qui rend la saisie par plage (§8 item 9) gratuite. Une ligne `OwnedVolume`
 * par tome, parce que c'est cette granularité qui permet de représenter un trou et donc de
 * calculer les manquants (§4.5).
 *
 * `skipDuplicates` plutôt qu'un diff préalable : la contrainte `(userId, editionId, number)` dit
 * déjà ce qui existe, et la relire pour l'éviter coûterait une requête par geste pour le même
 * résultat. Repasser sur une plage déjà possédée ne fait donc rien, ce qui est le comportement
 * qu'on veut quand un glissé recouvre des tomes déjà là.
 */
export const setOwnedRange = authActionClient
  .metadata({ actionName: "setOwnedRange" })
  .inputSchema(setOwnedRangeSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { mediaId, from, owned } = parsedInput;

    /*
      **Le miroir d'abord.** `Edition.mediaId` porte une clé étrangère vers `Media` : cocher un
      tome sur une œuvre que personne n'a jamais croisée échouerait au niveau de la base.
      `ensureMediaMirror` ne réécrit rien quand la ligne existe et n'est pas périmée.
    */
    await ensureMediaMirror(mediaId);

    const editionId = await defaultEditionId(mediaId);

    /*
      **Le plafond est relu de la base, jamais reçu du client.** « Du tome 1 au tome 1000 » sur une
      série de trente est une saisie erronée ou forgée, et dans les deux cas elle écrirait 970
      lignes dont aucune ne correspond à un livre. Quand le total est inconnu, il n'y a rien à
      plafonner — c'est justement le cas d'une série en cours de parution —, et le schéma borne
      déjà à `MAX_VOLUME_NUMBER`.

      Le retrait, lui, n'est pas plafonné : si un total a été corrigé à la baisse après coup, les
      tomes au-delà existent encore en base et doivent pouvoir partir.
    */
    const edition = await prisma.edition.findUnique({
      where: { id: editionId },
      select: { volumesTotal: true },
    });

    const ceiling = owned
      ? (edition?.volumesTotal ?? parsedInput.to)
      : parsedInput.to;
    const to = Math.min(parsedInput.to, ceiling);

    if (to < from) return { written: 0 };

    const numbers = Array.from(
      { length: to - from + 1 },
      (_, index) => from + index,
    );

    if (owned) {
      const { count } = await prisma.ownedVolume.createMany({
        data: numbers.map((number) => ({
          userId: ctx.user.id,
          editionId,
          number,
        })),
        skipDuplicates: true,
      });

      revalidateCollection(mediaId);
      return { written: count };
    }

    const { count } = await prisma.ownedVolume.deleteMany({
      where: { userId: ctx.user.id, editionId, number: { in: numbers } },
    });

    revalidateCollection(mediaId);
    return { written: count };
  });

/**
 * Corriger le nombre de tomes d'une édition.
 *
 * **Sans ce geste, l'écran ne sert à rien sur une série en cours de parution** : AniList ne donne
 * un nombre de volumes que pour les séries terminées, et ignore la notion d'édition (§9). Or
 * « il me manque lesquels ? » n'a de réponse que si l'on sait combien il y en a.
 *
 * L'édition est créée si elle n'existe pas encore : on peut donc déclarer « cette série fait
 * 110 tomes » avant d'en posséder un seul, ce qui est l'ordre naturel quand on commence une
 * collection.
 */
export const setEditionVolumesTotal = authActionClient
  .metadata({ actionName: "setEditionVolumesTotal" })
  .inputSchema(setEditionVolumesTotalSchema)
  .action(async ({ parsedInput }) => {
    const { mediaId, volumesTotal } = parsedInput;

    await ensureMediaMirror(mediaId);
    const editionId = await defaultEditionId(mediaId);

    await prisma.edition.update({
      where: { id: editionId },
      data: { volumesTotal },
    });

    revalidateCollection(mediaId);
    return { volumesTotal };
  });
