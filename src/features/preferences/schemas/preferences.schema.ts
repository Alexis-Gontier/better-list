import * as z from "zod";

/**
 * Les préférences d'affichage d'un compte (docs/PRODUCT.md §4.6).
 *
 * Les énumérations sont recopiées ici plutôt qu'importées du client Prisma : ces schémas valident
 * des entrées venues du navigateur, et un schéma de validation ne doit pas dépendre d'un module
 * généré côté serveur. Elles sont identiques à `ScoreFormat` et `TitleLanguage` dans
 * `prisma/schema.prisma` — un écart casserait au typecheck.
 *
 * **La langue de l'interface n'est pas ici.** Elle est en base pour mémoire, mais l'application est
 * en français uniquement (§7) : offrir un sélecteur à un seul choix serait une promesse creuse.
 */

export const scoreFormatSchema = z.enum(["POINT_100", "POINT_10", "POINT_5"]);
export type ScoreFormat = z.infer<typeof scoreFormatSchema>;

export const titleLanguageSchema = z.enum(["ROMAJI", "ENGLISH", "NATIVE"]);
export type TitleLanguage = z.infer<typeof titleLanguageSchema>;

export const preferencesSchema = z.object({
  scoreFormat: scoreFormatSchema,
  titleLanguage: titleLanguageSchema,
  /** Filtre 18+. Appliqué dans la requête, jamais par un masque d'affichage. */
  includeAdult: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;

/**
 * Ce qu'envoie l'écran de réglages : **ce qui a changé**, pas l'état complet.
 *
 * Comme pour le suivi, chaque contrôle enregistre seul. Envoyer les trois champs à chaque clic
 * ferait qu'un onglet resté ouvert réécrirait, en cochant une case, un réglage modifié ailleurs
 * entre-temps.
 */
export const updatePreferencesSchema = preferencesSchema.partial();

/**
 * Les valeurs par défaut, **alignées sur celles de `prisma/schema.prisma`**.
 *
 * Elles servent à deux endroits : le compte qui n'a pas encore de ligne de préférences, et le
 * visiteur non connecté d'une lecture partagée. Les écrire ici évite qu'un `??` dispersé dans les
 * composants finisse par en inventer d'autres.
 */
export const DEFAULT_PREFERENCES: Preferences = {
  scoreFormat: "POINT_10",
  titleLanguage: "ROMAJI",
  includeAdult: false,
};
