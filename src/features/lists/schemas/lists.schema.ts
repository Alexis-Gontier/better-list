import * as z from "zod";

/**
 * Formes des listes (docs/PRODUCT.md §4.4).
 *
 * Les identifiants de liste sont des `cuid` : ils viennent du client, donc ils sont **validés en
 * forme ici et vérifiés en propriété dans l'action**. Un schéma ne peut pas savoir à qui appartient
 * une liste ; c'est le rôle du `where` de la mutation, jamais celui de Zod.
 *
 * L'énumération de visibilité est recopiée du schéma Prisma plutôt qu'importée du client généré :
 * elle valide une entrée navigateur.
 */

export const listVisibilitySchema = z.enum(["PRIVATE", "UNLISTED"]);

const listIdSchema = z.string().min(1).max(64);
const mediaIdSchema = z.number().int().positive();

/**
 * Le titre est **obligatoire et le seul champ requis** : une liste sans nom ne se retrouve pas, et
 * tout le reste (description, visibilité) a un défaut raisonnable. `trim()` avant la borne, sinon
 * un titre fait de trois espaces passerait la validation.
 *
 * Définis une seule fois : créer et modifier posent exactement les mêmes règles, et deux copies
 * finiraient par diverger — un titre accepté à la création et refusé à la modification serait
 * incompréhensible pour qui le subit.
 */
const listTitleSchema = z
  .string()
  .trim()
  .min(1, "Un titre est nécessaire.")
  .max(120);
const listDescriptionSchema = z.string().trim().max(1000).nullable().optional();

export const createListSchema = z.object({
  title: listTitleSchema,
  description: listDescriptionSchema,
  visibility: listVisibilitySchema.default("PRIVATE"),
});

/**
 * Renommer et redécrire une liste.
 *
 * **Pas de `slug` ici, et c'est le point à ne pas rater.** Le recalculer depuis le nouveau titre
 * paraîtrait cohérent et casserait toute adresse déjà ouverte, mise en favori ou — dès V1.5 —
 * partagée. Le slug est dérivé du titre **à la création seulement** : il identifie la liste, il ne la
 * décrit pas. C'est aussi pourquoi l'écran affiche l'adresse et prévient qu'elle ne bouge pas.
 *
 * **Pas de `visibility` non plus.** Le passage en `UNLISTED` n'a de sens qu'avec un lien de partage,
 * qui est du V1.5 et qui bute encore sur l'adressage (`@@unique([ownerId, slug])`, voir
 * `lists.queries.ts`). Offrir l'interrupteur maintenant promettrait un partage qui n'existe pas.
 */
export const updateListSchema = z.object({
  listId: listIdSchema,
  title: listTitleSchema,
  description: listDescriptionSchema,
});

export const deleteListSchema = z.object({ listId: listIdSchema });

export const addToListSchema = z.object({
  listId: listIdSchema,
  mediaId: mediaIdSchema,
});

export const removeFromListSchema = z.object({
  listId: listIdSchema,
  mediaId: mediaIdSchema,
});

/**
 * Déplacer une œuvre dans une liste (V1.5).
 *
 * **On reçoit une position, pas un rang.** Laisser le navigateur envoyer la clé `rank` calculée
 * serait plus court d'une lecture, et faux : la clé serait alors une donnée client, calculée à partir
 * d'un ordre qui peut avoir changé depuis le rendu, et n'importe quoi pourrait être écrit dans la
 * colonne. Le serveur relit l'ordre réel et calcule lui-même — même principe que le plafond de
 * progression du suivi, dont le client n'est jamais juge.
 *
 * `toIndex` est la place visée dans la liste **telle qu'elle sera après le déplacement**, la
 * convention de dnd-kit. Elle est bornée côté serveur (`rankAfterMove`), pas refusée.
 */
export const reorderListItemSchema = z.object({
  listId: listIdSchema,
  mediaId: mediaIdSchema,
  toIndex: z.number().int().min(0).max(10_000),
});
