"use server";

import { revalidatePath } from "next/cache";

import { routes } from "@/config/routes";
import {
  rankAfterMove,
  rankForAppend,
} from "@/features/lists/lib/list-reorder";
import { generateShareToken } from "@/features/lists/lib/share-token";
import {
  addToListSchema,
  createListSchema,
  deleteListSchema,
  removeFromListSchema,
  reorderListItemSchema,
  shareListSchema,
  updateListSchema,
} from "@/features/lists/schemas/lists.schema";
import { ensureMediaMirror } from "@/features/media/server/media.mirror";
import { prisma } from "@/lib/db/prisma";
import { authActionClient } from "@/lib/safe-action";

/**
 * Les écritures sur mes listes (docs/conception.md §4.4).
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
 * **Le partage a ses propres actions**, et ne se mêle pas au renommage : publier une liste et
 * corriger son libellé n'ont ni la même portée ni le même défaire. Les mêler dans un formulaire
 * ferait d'« Enregistrer » un bouton dont on ne mesure plus les conséquences (`lists.schema.ts`).
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

/**
 * Les écrans qu'une écriture sur les listes périme.
 *
 * `/lists` toujours : sa grille, ses décomptes et sa mosaïque changent au moindre geste. **Et la
 * fiche quand un `mediaId` est en jeu** — c'est elle qui affiche les cases cochées, et sans cette
 * purge elle montrerait l'état d'avant au retour en arrière.
 *
 * `revalidatePath` et pas `revalidateTag` : ces lectures dépendent du visiteur et n'ont donc aucun
 * `"use cache"` à invalider (`lists.queries.ts`). Ce qu'on purge est le cache **client** du routeur,
 * celui qui garde une page déjà visitée.
 */
function revalidateLists(mediaId?: number) {
  revalidatePath(routes.lists.root);
  if (mediaId !== undefined) revalidatePath(routes.media(mediaId));
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
        kind: parsedInput.kind,
        cutoff: parsedInput.cutoff ?? null,
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
    const { listId, title, description, kind, cutoff } = parsedInput;

    await prisma.list.updateMany({
      where: { id: listId, ownerId: ctx.user.id },
      data: { title, description: description ?? null, kind, cutoff },
    });

    revalidateLists();
    // Le genre change l'affichage de la liste elle-même, pas seulement sa carte.
    revalidatePath(routes.lists.detail(listId));

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

/**
 * Ranger une œuvre dans une liste, depuis la fiche.
 *
 * **Trois pièges tiennent dans ces trente lignes**, et le brief d'ouverture les avait tous les trois
 * nommés d'avance :
 *
 * 1. **`ensureMediaMirror` avant l'écriture.** `ListItem.mediaId` porte une clé étrangère vers
 *    `Media` : ranger une œuvre que personne n'a jamais croisée échouerait au niveau de la base.
 *    C'est exactement le piège que le suivi a rencontré (`tracking.actions.ts`), et il vaut ici pour
 *    la même raison — on range depuis `/search` des œuvres absentes du miroir.
 * 2. **La propriété ne peut pas passer par un `where` sur `ListItem`** : celui-ci n'a pas
 *    d'`ownerId`. D'où la lecture de la liste d'abord — sans elle, un `cuid` deviné laisserait écrire
 *    dans la liste d'un autre membre.
 * 3. **`upsert` et non `create`.** `@@unique([listId, mediaId])` fait qu'un double clic, ou deux
 *    onglets, lèveraient sur la seconde insertion. `update: {}` rend le second geste inoffensif, et
 *    surtout **ne recalcule pas le rang** : ranger deux fois la même œuvre ne doit pas la déplacer en
 *    fin de liste.
 */
export const addToList = authActionClient
  .metadata({ actionName: "addToList" })
  .inputSchema(addToListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { listId, mediaId } = parsedInput;

    const list = await prisma.list.findFirst({
      where: { id: listId, ownerId: ctx.user.id },
      select: { id: true },
    });
    if (!list) throw new Error("Liste introuvable.");

    await ensureMediaMirror(mediaId);

    /*
      Une ligne lue, pas la liste entière : c'est tout ce dont `rankForAppend` a besoin, et c'est la
      raison d'être de l'index fractionnaire — ajouter à une liste de quarante œuvres coûte un
      `INSERT`, sans renuméroter quoi que ce soit.
    */
    const last = await prisma.listItem.findFirst({
      where: { listId },
      orderBy: { rank: "desc" },
      select: { rank: true },
    });

    await prisma.listItem.upsert({
      where: { listId_mediaId: { listId, mediaId } },
      create: { listId, mediaId, rank: rankForAppend(last?.rank ?? null) },
      update: {},
    });

    revalidateLists(mediaId);
    // La grille de la liste est derrière la fenêtre d'ajout : elle doit suivre chaque geste.
    revalidatePath(routes.lists.detail(listId));

    return { added: true };
  });

/**
 * Retirer une œuvre d'une liste.
 *
 * **Sans confirmation, et c'est une décision.** La case se recoche, l'œuvre garde sa fiche et son
 * suivi, et rien de ce qui disparaît n'est irremplaçable — seule sa place dans l'ordre l'est, et
 * elle se refait d'un glisser. La friction est réservée à la suppression d'une liste entière ; posée
 * partout, elle ne freinerait plus rien.
 *
 * **Une requête, et la propriété passe par la relation.** `deleteMany` accepte un filtre sur `list`,
 * donc la garde tient dans le `where` sans lecture préalable — et sur une liste qui n'est pas la
 * mienne, elle ne supprime rien plutôt que d'échouer.
 */
export const removeFromList = authActionClient
  .metadata({ actionName: "removeFromList" })
  .inputSchema(removeFromListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { listId, mediaId } = parsedInput;

    await prisma.listItem.deleteMany({
      where: { listId, mediaId, list: { ownerId: ctx.user.id } },
    });

    revalidateLists(mediaId);
    // La grille de la liste est derrière la fenêtre d'ajout : elle doit suivre chaque geste.
    revalidatePath(routes.lists.detail(listId));

    return { removed: true };
  });

/**
 * Partager une liste par lien non listé — **le jeton est fabriqué ici**.
 *
 * `shareListSchema` ne prend que l'identifiant, et son docstring dit pourquoi : ne pas accepter le
 * jeton en entrée est ce qui empêche quiconque de **se choisir une adresse** — ou d'écrire celle
 * d'une liste voisine. Il est tiré de `randomBytes` (`share-token.ts`), jamais de `Math.random()`,
 * parce qu'il est le seul secret qui protège une page répondant sans session.
 *
 * **Re-partager génère un autre jeton et tue l'ancien lien.** C'est une conséquence directe du
 * modèle à une seule colonne (§4.4) et non un effet de bord : il n'y a pas d'historique de jetons,
 * donc l'adresse précédente ne mène plus nulle part. Appeler cette action sur une liste déjà
 * partagée est donc une **rotation**, pas un no-op — l'appelant doit le dire à l'écran.
 *
 * Pas de gestion de collision : `shareToken` est unique en base, et produire deux fois le même sur
 * 144 bits est hors de portée du raisonnement. Si l'insertion échouait malgré tout, l'erreur remonte
 * plutôt que d'être réessayée en silence.
 */
export const shareList = authActionClient
  .metadata({ actionName: "shareList" })
  .inputSchema(shareListSchema)
  .action(async ({ parsedInput, ctx }) => {
    const shareToken = generateShareToken();

    /*
      `updateMany` porte la garde de propriété dans son `where`, comme les autres écritures — et son
      compte dit si la liste était bien la mienne. Zéro ligne veut dire « pas ta liste » ou « elle
      n'existe plus » : on ne rend surtout pas le jeton qu'on vient de fabriquer.
    */
    const { count } = await prisma.list.updateMany({
      where: { id: parsedInput.listId, ownerId: ctx.user.id },
      data: { shareToken },
    });

    if (count === 0) throw new Error("Liste introuvable.");

    revalidateLists();

    return { shareToken };
  });

/**
 * Cesser de partager — **le lien meurt, et rien ne le ressuscite**.
 *
 * Mettre `shareToken` à `null` suffit : `getSharedList` ne trouve plus rien et la page rend un 404.
 * Il n'y a pas d'historique à purger, et pas de cache non plus — la page partagée n'a aucun
 * `"use cache"`, précisément pour que la révocation soit immédiate.
 *
 * `@unique` sur une colonne nullable n'empêche pas les `NULL` multiples chez PostgreSQL : toutes les
 * listes non partagées cohabitent sans se disputer la contrainte.
 */
export const unshareList = authActionClient
  .metadata({ actionName: "unshareList" })
  .inputSchema(shareListSchema)
  .action(async ({ parsedInput, ctx }) => {
    await prisma.list.updateMany({
      where: { id: parsedInput.listId, ownerId: ctx.user.id },
      data: { shareToken: null },
    });

    revalidateLists();

    return { revoked: true };
  });
