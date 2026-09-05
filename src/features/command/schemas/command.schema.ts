import * as z from "zod";

import type { EntryUnit } from "@/features/tracking/lib/entry-format";

/**
 * Contrat de la palette de commandes.
 *
 * **C'est le seul endroit du projet où un composant client demande des données au serveur par HTTP**,
 * donc le seul qui ait besoin d'un contrat écrit des deux côtés. Ailleurs, une page serveur passe ses
 * données en propriétés et TypeScript suffit ; ici la réponse traverse le réseau, et un schéma est ce
 * qui empêche la forme de dériver d'un côté sans que l'autre le sache.
 *
 * Les libellés sont **déjà formatés par le serveur** (titre selon la préférence de langue, statut en
 * français). La palette n'a donc rien à mettre en forme, et surtout : elle n'a pas besoin de connaître
 * la préférence de titre du compte, qui est une lecture serveur.
 */

/** Ce que la palette envoie. Une saisie vide est valide — elle demande « où j'en suis ». */
export const commandQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
});

/**
 * `EntryUnit` est déclaré à la main dans `entry-format.ts` et reste la source de vérité. Le
 * `satisfies` garantit qu'aucune valeur inventée ne se glisse ici.
 */
const ENTRY_UNITS = [
  "episode",
  "chapitre",
] as const satisfies readonly EntryUnit[];

/** Une œuvre de ma bibliothèque. */
export const commandEntrySchema = z.object({
  mediaId: z.number().int(),
  title: z.string(),
  /** Statut en français, déjà traduit — « En cours », « En pause »… */
  status: z.string(),
  progress: z.number().int(),
  /** Épisodes ou chapitres connus. `null` sur une œuvre en cours de diffusion. */
  total: z.number().int().nullable(),
  unit: z.enum(ENTRY_UNITS),
  /**
   * Reste-t-il quelque chose à avancer ? Calculé côté serveur, seul juge du plafond
   * (`command.queries.ts` : `total === null || progress < total`).
   *
   * Ce champ portait la même règle que le « +1 » des vignettes, dans `entry-quick-progress.tsx` —
   * supprimé par la mise à blanc du 5 septembre 2026. La palette est donc, pour l'instant, le seul
   * endroit où l'avancement rapide existe encore : c'est ici qu'il faudra revenir lire la règle
   * quand les vignettes seront reconstruites, plutôt que de la réinventer.
   */
  canAdvance: z.boolean(),
});
export type CommandEntry = z.infer<typeof commandEntrySchema>;

/** Une œuvre du catalogue AniList. */
export const commandMediaSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  /** Ligne de contexte déjà assemblée — « Série TV · 2023 ». */
  meta: z.string(),
});

export const commandResultsSchema = z.object({
  entries: z.array(commandEntrySchema),
  media: z.array(commandMediaSchema),
});
export type CommandResults = z.infer<typeof commandResultsSchema>;

/**
 * Combien de lignes par groupe.
 *
 * Une palette qui déroule vingt résultats par groupe cesse d'être une palette : on la lit au lieu de
 * la traverser. Cinq et six tiennent dans la hauteur du dialogue sans défilement.
 */
export const COMMAND_ENTRIES_COUNT = 5;
export const COMMAND_MEDIA_COUNT = 6;
