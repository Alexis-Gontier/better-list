import * as z from "zod";

import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import {
  mediaCountrySchema,
  mediaFormatSchema,
  mediaStatusSchema,
  mediaTypeSchema,
} from "@/features/media/schemas/media.schema";

/**
 * Contrat d'entrée de la recherche AniList.
 *
 * La recherche vit dans l'URL : ce schéma est donc le point de passage entre des `searchParams`
 * (des chaînes, ou rien) et les variables typées envoyées à AniList. Les champs numériques sont
 * en `coerce` pour cette raison — `?page=2` arrive en `"2"`.
 */

export const MAX_PER_PAGE = 50;

/** Les plus vieilles entrées d'AniList datent des années 1940 ; on borne large. */
export const MIN_MEDIA_YEAR = 1940;
export const MAX_MEDIA_YEAR = 2100;

/** Garde-fou sur les listes de filtres : au-delà, l'URL n'est plus une URL. */
const MAX_FILTER_VALUES = 20;

// --- Tri -------------------------------------------------------------------

/**
 * Le tri est exposé en **champ + direction**, pas en valeur brute d'AniList.
 *
 * `MediaSort` encode la direction dans le nom (`SCORE` / `SCORE_DESC`), ce qui rend impossible un
 * bouton de direction générique : l'interface devrait savoir quelles valeurs ont un pendant
 * ascendant. On sépare donc les deux ici, et `toAniListSort` recompose l'énumération.
 */
export const sortFieldSchema = z.enum([
  "SEARCH_MATCH",
  "POPULARITY",
  "SCORE",
  "TRENDING",
  "FAVOURITES",
  "START_DATE",
  "UPDATED_AT",
  "TITLE_ROMAJI",
  "EPISODES",
]);
export type SortField = z.infer<typeof sortFieldSchema>;

export const sortDirectionSchema = z.enum(["ASC", "DESC"]);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

/**
 * `SEARCH_MATCH` classe par proximité avec la requête : il n'a pas de pendant ascendant, et lui
 * appliquer une direction reviendrait à demander « les moins pertinents d'abord ».
 */
export const SORT_FIELDS_WITHOUT_DIRECTION: SortField[] = ["SEARCH_MATCH"];

export function sortFieldHasDirection(field: SortField) {
  return !SORT_FIELDS_WITHOUT_DIRECTION.includes(field);
}

/** Recompose la valeur `MediaSort` attendue par AniList. */
export function toAniListSort(
  field: SortField,
  direction: SortDirection,
): string[] {
  if (!sortFieldHasDirection(field)) return [field];
  return [direction === "DESC" ? `${field}_DESC` : field];
}

// --- Entrée ----------------------------------------------------------------

export const searchMediaInputSchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  type: mediaTypeSchema.optional(),
  format: mediaFormatSchema.optional(),
  countryOfOrigin: mediaCountrySchema.optional(),
  status: mediaStatusSchema.optional(),
  /**
   * Genres et tags sont des vocabulaires contrôlés par AniList, qu'on ne duplique pas ici : on
   * valide la forme (chaînes courtes, liste bornée), AniList valide le contenu. Un genre inconnu
   * ne renvoie simplement aucun résultat.
   */
  genres: z
    .array(z.string().trim().min(1).max(50))
    .max(MAX_FILTER_VALUES)
    .nonempty()
    .optional(),
  tags: z
    .array(z.string().trim().min(1).max(80))
    .max(MAX_FILTER_VALUES)
    .nonempty()
    .optional(),
  seasonYear: z.coerce
    .number()
    .int()
    .min(MIN_MEDIA_YEAR)
    .max(MAX_MEDIA_YEAR)
    .optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  /**
   * Le défaut vient de la grille, pas d'AniList : `CATALOGUE_PAGE_SIZE` est le nombre qui remplit
   * des rangées entières à chacun de ses paliers de colonnes (`config/catalogue.ts`). Ce défaut
   * entre aussi dans la clé de cache des lectures — le changer invalide les entrées existantes,
   * ce qui est correct mais n'est pas gratuit.
   */
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PER_PAGE)
    .default(CATALOGUE_PAGE_SIZE),
  sortField: sortFieldSchema.default("SEARCH_MATCH"),
  sortDirection: sortDirectionSchema.default("DESC"),
  /** Filtre 18+. Désactivé par défaut, et appliqué côté serveur — jamais un masque CSS. */
  includeAdult: z.boolean().default(false),
});

/** Ce qu'on passe à `searchMedia` : tout est optionnel, les défauts sont dans le schéma. */
export type SearchMediaInput = z.input<typeof searchMediaInputSchema>;

/** Ce que le schéma produit une fois validé : plus aucun champ à défaut n'est optionnel. */
export type SearchMediaParams = z.output<typeof searchMediaInputSchema>;

/**
 * Ce qui peut venir de l'URL — tout sauf `includeAdult`.
 *
 * C'est une garantie de type, pas une convention : le filtre 18+ se dérive de la préférence du
 * compte côté serveur. S'il redevenait un paramètre acceptable, il suffirait de l'ajouter à
 * l'adresse pour le contourner. Les `searchParams` passent donc par ce schéma, jamais par
 * `searchMediaInputSchema` directement.
 */
export const searchFormSchema = searchMediaInputSchema.omit({
  includeAdult: true,
});
export type SearchFormInput = z.input<typeof searchFormSchema>;
export type SearchFormParams = z.output<typeof searchFormSchema>;
