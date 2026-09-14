import * as z from "zod";

/**
 * Ce que la cloche de l'en-tête annonce — **un épisode sorti que je n'ai pas vu**, rien d'autre.
 *
 * Il n'y a pas de table `Notification` derrière, et c'est délibéré (décision d'Alexis du
 * 14 septembre 2026) : le retard **est** l'état lu/non-lu. Une ligne existe tant que
 * `Entry.progress` est en arrière de la grille de diffusion, et disparaît au « +1 » — pas à
 * l'ouverture du menu. Une notification ne peut donc ni se perdre, ni survivre à ce qu'elle
 * annonçait, ni mentir sur ce qu'on a vu.
 */
export const episodeNotificationSchema = z.object({
  mediaId: z.number().int(),
  /** Déjà résolu dans la langue du compte : la préférence se lit au serveur, pas au menu. */
  title: z.string(),
  cover: z.string().nullable(),
  /** Le dernier épisode diffusé — celui que la ligne nomme. */
  episode: z.number().int(),
  /** Combien d'épisodes diffusés je n'ai pas vus. Strictement positif, sinon la ligne n'existe pas. */
  lag: z.number().int().positive(),
  /** Quand il est passé, en secondes Unix — l'unité d'AniList, et l'ordre du menu. */
  airedAt: z.number().int(),
});

export const episodeNotificationsSchema = z.object({
  /**
   * **AniList n'a pas répondu.**
   *
   * Sans ce drapeau, une panne et une boîte vide rendraient la même chose, et la cloche dirait
   * « rien de neuf » au moment précis où elle ne sait rien. C'est le seul mensonge qu'elle puisse
   * commettre, et c'est celui-ci qui l'empêche.
   */
  unavailable: z.boolean(),
  items: z.array(episodeNotificationSchema),
});
export type EpisodeNotifications = z.infer<typeof episodeNotificationsSchema>;
