import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsStringLiteral,
} from "nuqs/server";

import { ENTRY_STATUS_LABELS } from "@/features/tracking/lib/entry-format";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";

/**
 * Paramètres d'URL de la bibliothèque — **source unique, client et serveur**.
 *
 * Même principe que la recherche (`features/media/lib/search-params.ts`) : les parseurs de
 * `nuqs/server` sont isomorphes, la barre de filtres les utilise pour écrire l'URL et le composant
 * de résultats pour la lire. Un décodage maison côté serveur divergerait au premier changement.
 *
 * La différence avec la recherche est le lieu de la vérité : là-bas les filtres partent chez
 * AniList et un schéma Zod les borne ; ici ils deviennent un `where` Prisma sur **mes** lignes. Les
 * valeurs sont donc closes par `parseAsStringLiteral` — un statut inventé dans l'URL retombe sur
 * « tous » plutôt que d'atteindre la requête.
 */

/** Les statuts, dans l'ordre où on les parcourt : ce qu'on fait, ce qu'on fera, ce qui est fini. */
export const LIBRARY_STATUS_ORDER = [
  "CURRENT",
  "PLANNING",
  "COMPLETED",
  "PAUSED",
  "REPEATING",
  "DROPPED",
] as const satisfies readonly EntryStatus[];

export const LIBRARY_STATUS_OPTIONS = LIBRARY_STATUS_ORDER.map((status) => ({
  value: status,
  label: ENTRY_STATUS_LABELS[status],
}));

export const LIBRARY_TYPE_OPTIONS = [
  { value: "ANIME", label: "Animes" },
  { value: "MANGA", label: "Mangas" },
] as const;

/**
 * Les tris possibles.
 *
 * `recent` d'abord, et c'est un choix : une bibliothèque de suivi répond surtout à « où j'en étais
 * déjà ? ». Trier par titre par défaut ferait remonter une œuvre abandonnée en 2019 au-dessus de
 * celle regardée hier soir.
 */
export const LIBRARY_SORT_OPTIONS = [
  { value: "recent", label: "Activité récente" },
  { value: "title", label: "Titre" },
  { value: "score", label: "Ma note" },
  { value: "progress", label: "Progression" },
] as const;

export type LibrarySort = (typeof LIBRARY_SORT_OPTIONS)[number]["value"];

const STATUS_VALUES = LIBRARY_STATUS_ORDER.map((status) => status);
const TYPE_VALUES = LIBRARY_TYPE_OPTIONS.map((option) => option.value);
const SORT_VALUES = LIBRARY_SORT_OPTIONS.map((option) => option.value);

export const libraryFilterParsers = {
  status: parseAsStringLiteral(STATUS_VALUES),
  type: parseAsStringLiteral(TYPE_VALUES),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("recent"),
  page: parseAsInteger.withDefault(1),
};

/** Lecture des filtres depuis les `searchParams` d'une page. */
export const loadLibraryFilters = createLoader(libraryFilterParsers);

/**
 * Construction d'une URL de bibliothèque. Sert aux liens de statut et à la pagination : bâtir
 * l'adresse avec les parseurs qui la reliront garantit l'aller-retour, et omet les valeurs par
 * défaut.
 */
export const serializeLibraryFilters = createSerializer(libraryFilterParsers);

/** Ce que `loadLibraryFilters` renvoie — les filtres décodés d'une URL. */
export type LibraryFilterValues = Awaited<
  ReturnType<typeof loadLibraryFilters>
>;
