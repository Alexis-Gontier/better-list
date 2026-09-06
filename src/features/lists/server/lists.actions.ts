"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import { rankAfterMove } from "@/features/lists/lib/list-reorder";
import {
  createListSchema,
  deleteListSchema,
  reorderListItemSchema,
  updateListSchema,
} from "@/features/lists/schemas/lists.schema";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Les écritures sur mes listes (docs/PRODUCT.md §4.4).
 *
 * Elles suivent `tracking.actions.ts`, le modèle posé le 6 septembre 2026 : `authActionClient`
 * parce qu'une Server Action est un **endpoint POST à part entière**, appelable directement sans
 * jamais passer par le rendu d'une page — la garde de `app/(app)/layout.tsx` ne la protège donc
 * pas. L'utilisateur vient de `ctx` plutôt que d'être relu, ce qui rend l'oubli impossible plutôt
 * qu'improbable.
 *
 * next-safe-action est en **v8** : `.metadata()` puis `.inputSchema()`. `.schema()` est l'API v7 et
 * n'existe plus (CLAUDE.md).
 *
 * **Le partage n'est pas ici**, et ce n'est pas un oubli : `shareListSchema` attend `/l/[token]`,
 * qui n'est pas de cette branche. Publier une liste et la renommer n'ont ni la même portée ni le
 * même défaire, et `lists.schema.ts` dit pourquoi ils ne partagent pas de formulaire.
 */

/**
 * **`ownerId` est dans le `where`, jamais dans une vérification préalable.**
 *
 * C'est le point de sécurité de toute la branche. Un identifiant de liste est un `cuid` qui vient
 * du client : `lists.schema.ts` en valide la *forme*, et c'est le `where` de la mutation qui en
 * valide la *propriété* — un schéma ne peut pas savoir à qui appartient une liste. Sans cette
 * condition, un identifiant deviné laisserait renommer ou supprimer la liste d'un autre membre.
 *
 * `updateMany` et `deleteMany` plutôt que leurs variantes au singulier : celles-ci **lèvent** quand
 * aucune ligne ne correspond, ce qui donnerait une erreur serveur aussi bien pour « ce n'est pas ta
 * liste » que pour « elle est déjà supprimée ». La forme plurielle ne fait rien, ce qui est le bon
 * résultat pour un geste dont le but est que la ligne n'existe plus — deux onglets, un double clic.
 * C'est le raisonnement de `removeEntry`, et il vaut ici pour la même raison.
 */

/** L'écran que ces trois gestes périment. La fiche s'y ajoutera avec le rangement (passe 3). */
function revalidateLists() {
  /*
    `revalidatePath` et pas `revalidateTag` : ces lectures dépendent du visiteur et n'ont donc aucun
    `"use cache"` à invalider (`lists.queries.ts`). Ce qu'on purge est le cache **client** du
    routeur, celui qui garde une page déjà visitée.
  */
  revalidatePath(routes.lists.root);
}

/**
 * Créer une liste.
 *
 * **Le titre est le seul champ requis** — une liste sans nom ne se retrouve pas, et la description
 * a un défaut raisonnable. Les bornes sont dans `createListSchema` et ne sont pas redites ici.
 *
 * `description` arrive `undefined` quand le champ n'a pas été rempli, et la colonne est nullable :
 * le `?? null` fait la conversion une bonne fois, plutôt que de laisser Prisma décider de ce que
 * veut dire l'absence.
 */
export const createList = authActionClient
  .metadata({ actionName: "createList" })
  .inputSchema(createListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const list = await prisma.list.create({
      data: {
        ownerId: ctx.user.id,
        title: parsedInput.title,
        description: parsedInput.description ?? null,
      },
      select: { id: true },
    });

    revalidateLists();

    return { id: list.id };
  });

/**
 * Renommer une liste, et réécrire sa description.
 *
 * **Le titre n'est qu'un libellé** : l'adresse d'une liste est son `id`, donc renommer ne peut
 * casser aucun lien — pas même celui du partage, qui porte un jeton.
 */
export const updateList = authActionClient
  .metadata({ actionName: "updateList" })
  .inputSchema(updateListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { listId, title, description } = parsedInput;

    await prisma.list.updateMany({
      where: { id: listId, ownerId: ctx.user.id },
      data: { title, description: description ?? null },
    });

    revalidateLists();

    return { updated: true };
  });

/**
 * Supprimer une liste — **et tout ce qu'elle contenait**.
 *
 * `ListItem` porte `onDelete: Cascade` vers `List` (prisma/schema.prisma) : la suppression emporte
 * donc l'ordre patiemment construit, sans reprise possible. C'est exactement pourquoi l'appelant
 * demande confirmation par `alert-dialog`, et pourquoi cette confirmation **nomme le nombre
 * d'œuvres perdues** — la même règle que le retrait d'une œuvre du suivi, qui emporte son journal.
 *
 * Ce qui n'est **pas** emporté : les œuvres elles-mêmes. `ListItem` pointe le miroir `Media`,
 * partagé entre les comptes, et la cascade ne remonte pas dans ce sens.
 */
export const deleteList = authActionClient
  .metadata({ actionName: "deleteList" })
  .inputSchema(deleteListSchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.list.deleteMany({
      where: { id: parsedInput.listId, ownerId: ctx.user.id },
    });

    revalidateLists();

    return { deleted: true };
  });

/**
 * Déplacer une œuvre dans sa liste.
 *
 * **Le rang est calculé par le serveur, jamais reçu du client** — la décision est dans le docstring
 * de `reorderListItemSchema`, et elle vaut d'être redite ici : accepter la clé `rank` du navigateur
 * aurait économisé une lecture et laissé écrire n'importe quoi dans la colonne, à partir d'un ordre
 * qui peut avoir changé depuis le rendu. On reçoit une **position**, on relit l'ordre réel, on
 * calcule. C'est le même principe que le plafond de progression du suivi, dont le client n'est
 * jamais juge.
 *
 * `rankAfterMove` fait le calcul, et c'est **la seule partie qui pouvait se tromper d'une case** :
 * elle est isolée et testée depuis le premier jour (`features/lists/lib/list-reorder.ts`). Elle
 * rend `null` quand il n'y a rien à faire — élément inconnu, ou déjà à sa place —, et on n'écrit
 * pas dans ce cas : réordonner sans rien déplacer ne doit pas toucher la base.
 *
 * **Un déplacement ne touche qu'une ligne.** C'est toute la raison d'être de l'index fractionnaire :
 * déplacer la quarantième œuvre coûte un `UPDATE`, pas quarante.
 *
 * La propriété se vérifie d'abord, comme pour le rangement : `ListItem` ne porte pas d'`ownerId`,
 * donc aucun `where` sur lui ne peut la garantir tout seul.
 */
export const reorderListItem = authActionClient
  .metadata({ actionName: "reorderListItem" })
  .inputSchema(reorderListItemSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { listId, mediaId, toIndex } = parsedInput;

    const list = await prisma.list.findFirst({
      where: { id: listId, ownerId: ctx.user.id },
      select: { id: true },
    });
    if (!list) throw new Error("Liste introuvable.");

    /*
      L'ordre **réel**, relu maintenant : c'est ce qui rend le calcul juste même si un autre onglet a
      déplacé quelque chose entre le rendu et le geste.
    */
    const items = await prisma.listItem.findMany({
      where: { listId },
      orderBy: { rank: "asc" },
      select: { id: true, mediaId: true, rank: true },
    });

    const moved = items.find((item) => item.mediaId === mediaId);
    if (!moved) throw new Error("Cette œuvre n'est pas dans la liste.");

    const rank = rankAfterMove(items, moved.id, toIndex);
    if (rank === null) return { moved: false };

    await prisma.listItem.update({
      where: { id: moved.id },
      data: { rank },
    });

    /*
      Les **deux** écrans changent : la fiche de la liste, évidemment, mais aussi `/lists` — sa
      mosaïque montre les quatre premières jaquettes **par rang**, donc déplacer une œuvre en tête
      change la carte. C'est le genre d'oubli qui ne se voit qu'en revenant en arrière.
    */
    revalidatePath(routes.lists.detail(listId));
    revalidatePath(routes.lists.root);

    return { moved: true };
  });
