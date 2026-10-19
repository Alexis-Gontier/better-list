import * as z from "zod";

import {
  fuzzyDateSchema,
  mediaCompactSchema,
} from "@/features/media/schemas/media.schema";

/**
 * Formes AniList d'un personnage et d'un membre du staff (docs/decisions.md, D19).
 *
 * **Un tableau AniList peut arriver à `null`**, pas seulement absent : c'est ce qui a fait tomber
 * la fiche d'une œuvre sans audience le 26 septembre 2026 (voir l'historique git). `.default([])` ne
 * couvre que l'absence, d'où ce `transform` qui garde un tableau pour les lecteurs.
 */
function listOf<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullish()
    .transform((list) => list ?? []);
}

const personImageSchema = z.object({ large: z.string().nullable() }).nullable();

const personNameSchema = z.object({
  full: z.string().nullable(),
  native: z.string().nullable(),
  alternative: listOf(z.string().nullable()),
});

/**
 * La page d'une liste chez AniList. `total` plafonne à 500 sur ces listes (relevé le 26 septembre
 * 2026) : seul `hasNextPage` dit la vérité sur la suite, et `total` ne sert qu'à savoir si la liste
 * est vide — sous le plafond, zéro est exact.
 */
const pageInfoSchema = z.object({
  total: z.number().int().nullable(),
  hasNextPage: z.boolean().nullable(),
});

/**
 * L'œuvre d'une grille de personne : la carte du catalogue, plus l'année de début qui sert à
 * grouper les rôles d'un staff.
 */
export const peopleMediaSchema = mediaCompactSchema.extend({
  startDate: z.object({ year: z.number().int().nullable() }).nullable(),
});
export type PeopleMedia = z.infer<typeof peopleMediaSchema>;

const personRefSchema = z.object({
  id: z.number().int(),
  name: z.object({ full: z.string().nullable() }),
  image: personImageSchema,
});

function connectionOf<T extends z.ZodType>(edge: T) {
  return z.object({ pageInfo: pageInfoSchema, edges: listOf(edge) }).nullable();
}

export type PeopleConnection<E> = {
  pageInfo: z.infer<typeof pageInfoSchema>;
  edges: E[];
} | null;

export const characterMediaEdgeSchema = z.object({
  characterRole: z.string().nullable(),
  voiceActors: listOf(personRefSchema),
  node: peopleMediaSchema,
});
export type CharacterMediaEdge = z.infer<typeof characterMediaEdgeSchema>;

export const characterSchema = z.object({
  id: z.number().int(),
  name: personNameSchema.extend({
    alternativeSpoiler: listOf(z.string().nullable()),
  }),
  image: personImageSchema,
  description: z.string().nullable(),
  gender: z.string().nullable(),
  /** Texte libre chez AniList (« 17- », « 20s »), pas un nombre. */
  age: z.string().nullable(),
  bloodType: z.string().nullable(),
  favourites: z.number().int().nullable(),
  dateOfBirth: fuzzyDateSchema.nullable(),
  media: connectionOf(characterMediaEdgeSchema),
});
export type Character = z.infer<typeof characterSchema>;

export const characterDataSchema = z.object({
  Character: characterSchema.nullable(),
});

export const voiceRoleEdgeSchema = z.object({
  characterRole: z.string().nullable(),
  /** Les personnages que **cette personne** double dans l'œuvre — plusieurs parfois. */
  characters: listOf(personRefSchema.nullable()),
  node: peopleMediaSchema,
});
export type VoiceRoleEdge = z.infer<typeof voiceRoleEdgeSchema>;

export const staffRoleEdgeSchema = z.object({
  staffRole: z.string().nullable(),
  node: peopleMediaSchema,
});
export type StaffRoleEdge = z.infer<typeof staffRoleEdgeSchema>;

export const staffSchema = z.object({
  id: z.number().int(),
  name: personNameSchema,
  image: personImageSchema,
  description: z.string().nullable(),
  gender: z.string().nullable(),
  /** Un nombre ici, à l'inverse du personnage. */
  age: z.number().int().nullable(),
  bloodType: z.string().nullable(),
  favourites: z.number().int().nullable(),
  primaryOccupations: listOf(z.string().nullable()),
  yearsActive: listOf(z.number().int().nullable()),
  homeTown: z.string().nullable(),
  dateOfBirth: fuzzyDateSchema.nullable(),
  /** Un objet aux trois champs nuls pour une personne vivante, pas `null`. */
  dateOfDeath: fuzzyDateSchema.nullable(),
  voiceRoles: connectionOf(voiceRoleEdgeSchema),
  animeRoles: connectionOf(staffRoleEdgeSchema),
  mangaRoles: connectionOf(staffRoleEdgeSchema),
});
export type Staff = z.infer<typeof staffSchema>;

export const staffDataSchema = z.object({ Staff: staffSchema.nullable() });
