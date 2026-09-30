import * as z from "zod";

/**
 * Ce qu'on met en favori, et l'état qu'on veut lui donner.
 *
 * **Une personne voyage avec son instantané** — nom et portrait —, parce qu'elle n'existe pas en
 * base : c'est ce qu'affichera le profil, sans requête AniList. Le client l'a déjà sous les yeux ;
 * le cercle étant privé, on lui fait confiance pour le texte, mais pas pour l'adresse de l'image,
 * qui ne peut venir que du CDN d'AniList — le seul hôte que `next.config.ts` laisse charger.
 */

const ANILIST_IMAGE_PREFIX = "https://s4.anilist.co/file/";

const anilistIdSchema = z.number().int().positive();

const mediaTargetSchema = z.object({
  kind: z.literal("MEDIA"),
  anilistId: anilistIdSchema,
});

const personTargetSchema = z.object({
  kind: z.enum(["CHARACTER", "STAFF"]),
  anilistId: anilistIdSchema,
  name: z.string().trim().min(1).max(200),
  image: z
    .url()
    .refine((url) => url.startsWith(ANILIST_IMAGE_PREFIX), {
      message: "Image hors AniList.",
    })
    .nullable(),
});

export const favoriteTargetSchema = z.discriminatedUnion("kind", [
  mediaTargetSchema,
  personTargetSchema,
]);

export type FavoriteTarget = z.infer<typeof favoriteTargetSchema>;
export type FavoriteKind = FavoriteTarget["kind"];

/**
 * **L'état voulu, pas une bascule.** Deux clics rapides, ou deux onglets, enverraient deux
 * « bascule » qui s'annulent ; deux « favori : oui » laissent la même ligne.
 */
export const setFavoriteSchema = z.object({
  target: favoriteTargetSchema,
  favorite: z.boolean(),
});

export type SetFavoriteInput = z.infer<typeof setFavoriteSchema>;
