"use server";

import { generateKeyBetween } from "fractional-indexing";
import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { rankAfterMove } from "@/features/lists/lib/list-reorder";
import {
  addToListSchema,
  createListSchema,
  deleteListSchema,
  removeFromListSchema,
  reorderListItemSchema,
  updateListSchema,
} from "@/features/lists/schemas/lists.schema";
import { ensureMediaMirror } from "@/features/media/server/media.mirror";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Mutations des listes (docs/PRODUCT.md §4.4).
 *
 * **Un `listId` vient toujours du navigateur.** Chaque mutation porte donc `ownerId` dans son
 * `where` — jamais une lecture suivie d'une écriture, qui laisserait une fenêtre entre les deux, et
 * jamais une vérification en amont qu'on pourrait oublier d'écrire. Une liste qui n'est pas à moi ne
 * correspond à aucune ligne, et l'action échoue sans rien révéler de son existence.
 */

/**
 * Ce que le rang doit valoir pour un ajout en fin de liste.
 *
 * `generateKeyBetween(dernier, null)` produit une clé qui trie après tout le reste, sans toucher aux
 * lignes existantes. C'est tout l'intérêt de l'index fractionnaire : le glisser-déposer de V1.5
 * insérera *entre* deux clés avec la même fonction, et une seule ligne bougera.
 */
async function nextRank(listId: string): Promise<string> {
  const last = await prisma.listItem.findFirst({
    where: { listId },
    orderBy: { rank: "desc" },
    select: { rank: true },
  });

  return generateKeyBetween(last?.rank ?? null, null);
}

export const createList = authActionClient
  .metadata({ actionName: "createList" })
  .inputSchema(createListSchema)
  .action(async ({ parsedInput: { title, description, visibility }, ctx }) => {
    const list = await prisma.list.create({
      data: {
        ownerId: ctx.user.id,
        title,
        description: description ?? null,
        visibility,
      },
      // L'`id` repart au client : c'est à la fois l'adresse de la liste, vers laquelle le dialogue
      // de création navigue, et ce que « Ajouter à une liste » passe à la mutation suivante quand on
      // crée puis remplit d'un geste.
      select: { id: true, title: true },
    });

    revalidatePath(routes.lists.root);

    return list;
  });

/**
 * Renommer et redécrire une liste.
 *
 * **L'adresse ne bouge pas**, quel que soit le nouveau titre : elle est faite de l'`id`, pas d'un
 * slug dérivé du titre. C'est précisément pour ça qu'elle l'est — un lien déjà ouvert ou mis en
 * favori survit au renommage sans qu'aucune action n'ait à y penser.
 *
 * `updateMany` plutôt que `update`, comme les autres mutations du domaine : c'est la seule forme qui
 * accepte un `where` non unique, donc la seule qui accepte `ownerId`. Une liste qui n'est pas à moi ne
 * correspond à aucune ligne — indiscernable d'une liste inexistante.
 */
export const updateList = authActionClient
  .metadata({ actionName: "updateList" })
  .inputSchema(updateListSchema)
  .action(async ({ parsedInput: { listId, title, description }, ctx }) => {
    const { count } = await prisma.list.updateMany({
      where: { id: listId, ownerId: ctx.user.id },
      // `?? null` et non `?? undefined` : vider le champ de description **efface** la description,
      // là où `undefined` la laisserait en place. C'est la même distinction que `saveEntrySchema`
      // (« je n'y touche pas » contre « efface »), et le formulaire envoie toujours les deux champs.
      data: { title, description: description ?? null },
    });

    if (count === 0) throw new Error("Liste introuvable.");

    // Le chemin à revalider se déduit du `listId` reçu — plus de relecture pour retrouver l'adresse,
    // c'est l'autre gain de l'URL par `id`. Le `count` a déjà prouvé que la liste était bien à moi.
    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(listId));

    return { updated: true };
  });

export const deleteList = authActionClient
  .metadata({ actionName: "deleteList" })
  .inputSchema(deleteListSchema)
  .action(async ({ parsedInput: { listId }, ctx }) => {
    // `ListItem` part en cascade avec la liste : supprimer une liste, c'est supprimer son contenu,
    // pas laisser des lignes orphelines. Les `Media` du miroir restent — ils sont partagés.
    const { count } = await prisma.list.deleteMany({
      where: { id: listId, ownerId: ctx.user.id },
    });

    if (count === 0) throw new Error("Liste introuvable.");

    revalidatePath(routes.lists.root);
    return { deleted: true };
  });

export const addToList = authActionClient
  .metadata({ actionName: "addToList" })
  .inputSchema(addToListSchema)
  .action(async ({ parsedInput: { listId, mediaId }, ctx }) => {
    // La liste doit être à moi. Lecture close sur `ownerId`, donc une liste étrangère est
    // indiscernable d'une liste inexistante.
    const list = await prisma.list.findFirst({
      where: { id: listId, ownerId: ctx.user.id },
      select: { id: true },
    });

    if (!list) throw new Error("Liste introuvable.");

    // L'œuvre doit exister en base avant qu'une clé étrangère y pointe — même règle que le suivi.
    const mirrored = await ensureMediaMirror(mediaId);
    if (!mirrored) throw new Error(`Œuvre introuvable : ${mediaId}`);

    /**
     * `upsert` sur la contrainte `(listId, mediaId)` : ajouter deux fois la même œuvre est un
     * non-événement, pas une erreur (§4.4 — une œuvre n'apparaît qu'une fois). Le `update` vide
     * garde le rang et la note d'origine, là où une réinsertion les écraserait.
     */
    await prisma.listItem.upsert({
      where: { listId_mediaId: { listId: list.id, mediaId } },
      create: { listId: list.id, mediaId, rank: await nextRank(list.id) },
      update: {},
    });

    // La liste est modifiée : son `updatedAt` change, donc l'ordre de la page d'index aussi.
    await prisma.list.update({
      where: { id: list.id },
      data: { updatedAt: new Date() },
    });

    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(list.id));
    revalidatePath(routes.media(mediaId));

    return { added: true };
  });

/**
 * Déplacer une œuvre dans une liste (V1.5).
 *
 * **Une seule ligne est réécrite**, et c'est ce que la colonne `rank` promettait depuis le premier
 * jour : l'index fractionnaire étant une chaîne, insérer entre deux clés ne demande jamais de
 * renuméroter la suite. Déplacer la quarantième œuvre coûte un `UPDATE`, pas quarante.
 *
 * L'ordre est **relu ici** plutôt que reçu du navigateur : le client envoie une position, le serveur
 * connaît les rangs. Ça vaut pour la correction — l'ordre a pu changer depuis le rendu — autant que
 * pour la sûreté : sans ça, `rank` serait une colonne que le client écrit à sa guise.
 *
 * La lecture est close sur `ownerId` **par la relation**, donc une liste étrangère ne ramène aucune
 * ligne et le déplacement échoue sans rien révéler de son existence.
 */
export const reorderListItem = authActionClient
  .metadata({ actionName: "reorderListItem" })
  .inputSchema(reorderListItemSchema)
  .action(async ({ parsedInput: { listId, mediaId, toIndex }, ctx }) => {
    const items = await prisma.listItem.findMany({
      where: { listId, list: { ownerId: ctx.user.id } },
      orderBy: { rank: "asc" },
      select: { id: true, rank: true, mediaId: true },
    });

    const moved = items.find((item) => item.mediaId === mediaId);
    if (!moved) throw new Error("Œuvre introuvable dans cette liste.");

    const rank = rankAfterMove(items, moved.id, toIndex);

    // Reposer une œuvre là où elle était n'est pas une erreur, c'est un non-événement : on n'écrit
    // pas, donc `updatedAt` ne bouge pas et la liste ne remonte pas en tête de l'index pour rien.
    if (rank === null) return { reordered: false };

    // `moved.id` vient de la lecture close sur le propriétaire, jamais du navigateur : l'`update` par
    // clé primaire est donc sûr ici, là où les autres mutations passent par `updateMany`.
    await prisma.listItem.update({ where: { id: moved.id }, data: { rank } });

    await prisma.list.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });

    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(listId));

    return { reordered: true };
  });

export const removeFromList = authActionClient
  .metadata({ actionName: "removeFromList" })
  .inputSchema(removeFromListSchema)
  .action(async ({ parsedInput: { listId, mediaId }, ctx }) => {
    /**
     * La propriété est vérifiée **dans le `where` de la suppression**, par la relation : pas de
     * lecture préalable, donc pas de fenêtre entre le contrôle et l'écriture.
     */
    const { count } = await prisma.listItem.deleteMany({
      where: { listId, mediaId, list: { ownerId: ctx.user.id } },
    });

    if (count === 0) throw new Error("Œuvre introuvable dans cette liste.");

    revalidatePath(routes.lists.root);
    revalidatePath(routes.lists.detail(listId));
    revalidatePath(routes.media(mediaId));

    return { removed: true };
  });
