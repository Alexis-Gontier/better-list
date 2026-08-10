import * as z from "zod";

/**
 * Formes des listes (docs/PRODUCT.md §4.4).
 *
 * Les identifiants de liste sont des `cuid` : ils viennent du client, donc ils sont **validés en
 * forme ici et vérifiés en propriété dans l'action**. Un schéma ne peut pas savoir à qui appartient
 * une liste ; c'est le rôle du `where` de la mutation, jamais celui de Zod.
 *
 * **Il n'y a pas de schéma de visibilité.** Une liste est partagée si et seulement si elle porte un
 * jeton (§4.4), et ce jeton n'entre jamais par ici : il est fabriqué par le serveur, jamais reçu du
 * navigateur. Un champ que le client pourrait proposer serait un champ qu'il pourrait choisir.
 */

const listIdSchema = z.string().min(1).max(64);
const mediaIdSchema = z.number().int().positive();

/**
 * Le titre est **obligatoire et le seul champ requis** : une liste sans nom ne se retrouve pas, et
 * la description a un défaut raisonnable. `trim()` avant la borne, sinon un titre fait de trois
 * espaces passerait la validation.
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
});

/**
 * Renommer et redécrire une liste.
 *
 * **Le partage n'est pas ici, et ce n'est pas un oubli** : il a ses propres actions (`shareList`,
 * `unshareList`). Publier une liste et la renommer n'ont ni la même portée ni le même défaire —
 * l'une expose un contenu à l'extérieur du cercle, l'autre corrige un libellé. Les mêler dans un
 * formulaire ferait d'« Enregistrer » un bouton dont on ne mesure plus les conséquences.
 *
 * Le titre n'est qu'un libellé : l'adresse de la liste est son `id`, donc renommer ne peut pas
 * casser un lien — le lien de partage pas davantage, puisqu'il porte un jeton.
 */
export const updateListSchema = z.object({
  listId: listIdSchema,
  title: listTitleSchema,
  description: listDescriptionSchema,
});

export const deleteListSchema = z.object({ listId: listIdSchema });

/**
 * Partager une liste, ou cesser de la partager.
 *
 * Les deux ne prennent que l'identifiant : **le jeton n'entre jamais par le navigateur.** Le
 * fabriquer côté serveur est ce qui garantit qu'il est imprévisible, et ne pas l'accepter en entrée
 * est ce qui empêche quiconque de se choisir une adresse — ou d'écrire celle d'une liste voisine.
 */
export const shareListSchema = z.object({ listId: listIdSchema });

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
