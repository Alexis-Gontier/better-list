import * as z from "zod";

/**
 * Formes du suivi (docs/conception.md §4.2).
 *
 * Les énumérations sont recopiées ici plutôt qu'importées du client Prisma : ces schémas valident
 * des entrées venues du navigateur, et un schéma de validation ne doit pas dépendre d'un module
 * généré côté serveur. Elles sont identiques à `EntryStatus` dans `prisma/schema.prisma` — un
 * écart casserait au typecheck, à l'écriture.
 */

export const entryStatusSchema = z.enum([
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "PAUSED",
  "DROPPED",
  "REPEATING",
]);
export type EntryStatus = z.infer<typeof entryStatusSchema>;

/**
 * Note **toujours sur 0–100**, quelle que soit l'échelle affichée.
 *
 * C'est la règle du §4.2 : l'échelle est une préférence d'affichage, le stockage ne perd jamais de
 * précision. `null` distingue « pas encore noté » de « noté zéro », qui est un jugement.
 */
export const entryScoreSchema = z.number().int().min(0).max(100).nullable();

/**
 * Bornes de progression. Le plafond réel (nombre d'épisodes) dépend de l'œuvre et n'est pas
 * toujours connu — une série en cours n'a pas de total —, donc il se vérifie côté serveur contre
 * le miroir, pas ici.
 */
const progressSchema = z.number().int().min(0).max(100_000);

/**
 * Date saisie à la main, dans le format que produit un `<input type="date">`.
 *
 * Une chaîne et non un `Date` : c'est ce que le navigateur envoie, et une date sérialisée puis
 * désérialisée à travers la frontière client/serveur est une source d'écarts de fuseau horaire
 * pour rien. La conversion se fait côté serveur, une fois.
 */
export const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ")
  .nullable();

/**
 * Mise à jour du suivi d'une œuvre.
 *
 * Tous les champs sont optionnels : le panneau envoie **ce qui a changé**, pas l'état complet.
 * Sans ça, deux modifications concurrentes depuis deux onglets se recouvriraient l'une l'autre.
 *
 * C'est aussi ce qui rend possible la règle « automatique par défaut, rattrapable à la main » :
 * `undefined` veut dire « je n'y touche pas, débrouille-toi », là où `null` veut dire « efface ».
 * Les deux ne peuvent pas être confondus, sinon toute date posée automatiquement serait effacée
 * au premier clic sur un bouton voisin.
 */
/**
 * Le plafond des relectures.
 *
 * Un relecteur acharné plafonne bien avant mille ; au-delà, c'est une saisie erronée. Il est
 * **exporté** parce que le pas de relecture du formulaire s'arrête au même nombre : deux bornes
 * écrites séparément finiraient par diverger, et le client offrirait un cran que le serveur
 * refuserait.
 */
export const MAX_REPEAT_COUNT = 1000;

export const saveEntrySchema = z.object({
  mediaId: z.number().int().positive(),
  status: entryStatusSchema.optional(),
  progress: progressSchema.optional(),
  progressVolumes: progressSchema.nullable().optional(),
  score: entryScoreSchema.optional(),
  notes: z.string().max(5000).nullable().optional(),
  startedAt: entryDateSchema.optional(),
  finishedAt: entryDateSchema.optional(),
  repeatCount: z.number().int().min(0).max(MAX_REPEAT_COUNT).optional(),
});
export type SaveEntryInput = z.infer<typeof saveEntrySchema>;

/** Suppression du suivi — l'œuvre sort de la bibliothèque, avec son journal. */
export const removeEntrySchema = z.object({
  mediaId: z.number().int().positive(),
});
