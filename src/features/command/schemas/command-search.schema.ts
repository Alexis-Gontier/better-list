import { z } from "zod";

import { entryStatusSchema } from "@/features/tracking/schemas/tracking.schema";

/**
 * Le contrat de la recherche de la palette — **les deux côtés du route handler**.
 *
 * Un seul fichier pour la question et la réponse : le client valide ce qu'il reçoit avec le même
 * schéma que le serveur a suivi pour l'écrire. Une forme qui dérive d'un côté casse la validation
 * de l'autre au lieu de passer en silence.
 */

/**
 * Le terme cherché.
 *
 * **Deux caractères au moins** : une lettre seule ne départage rien sur un catalogue de dizaines de
 * milliers d'œuvres, et chaque requête compte sur un quota de trente par minute partagé par tout le
 * cercle. **Cent au plus** : aucun titre n'en demande autant, et une chaîne sans borne entre telle
 * quelle dans la clé de cache.
 */
export const COMMAND_SEARCH_MIN_LENGTH = 2;

export const commandSearchQuerySchema = z.object({
  q: z.string().trim().min(COMMAND_SEARCH_MIN_LENGTH).max(100),
});

/**
 * Une ligne de résultat, **déjà prête à afficher**.
 *
 * Le titre arrive dans la langue choisie par le compte, le format arrive en français : le client
 * n'a rien à savoir des préférences ni des énumérations d'AniList. C'est aussi ce qui garde la
 * réponse petite — cinq lignes plates plutôt que cinq médias complets.
 */
export const commandSearchItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  format: z.string().nullable(),
  year: z.number().int().nullable(),
  cover: z.string().nullable(),
  /** Mon statut sur cette œuvre, ou `null` quand elle n'est pas dans ma bibliothèque. */
  status: entryStatusSchema.nullable(),
});

export const commandSearchResultSchema = z.object({
  items: z.array(commandSearchItemSchema),
  total: z.number().int(),
  /** `true` quand AniList a touché son plafond : `total` ne veut plus dire « combien ». */
  totalIsCapped: z.boolean(),
  /** `true` quand AniList n'a pas répondu et que les lignes viennent de la copie locale. */
  fromMirror: z.boolean(),
});
export type CommandSearchResult = z.infer<typeof commandSearchResultSchema>;
