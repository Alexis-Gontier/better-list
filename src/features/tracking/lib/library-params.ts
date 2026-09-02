import {
  createLoader,
  createSerializer,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { DEFAULT_VIEW_MODE, VIEW_MODES } from "@/config/catalogue";
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
  /**
   * Le terme de recherche, qui ne part **jamais chez AniList**.
   *
   * C'est toute la différence avec `/search` : la bibliothèque ne cherche que dans les colonnes de
   * titre du miroir local (docs/PRODUCT.md §4.1), donc une frappe ne coûte rien au quota de 30
   * requêtes par minute. C'est ce qui rend la recherche à la volée acceptable ici alors qu'elle est
   * anti-rebondie sur le catalogue.
   *
   * Sans lui, la seule façon de retrouver une œuvre parmi plusieurs centaines de suivis était de
   * paginer jusqu'à elle — ou de passer par la palette ⌘K, qui ne montre que huit lignes.
   */
  q: parseAsString.withDefault(""),
  status: parseAsStringLiteral(STATUS_VALUES),
  type: parseAsStringLiteral(TYPE_VALUES),
  /**
   * Le genre — **le seul filtre ouvert de cette liste**, et l'exception se justifie.
   *
   * Les autres valeurs sont closes parce qu'on les connaît à l'écriture ; les genres, eux,
   * viennent d'AniList et sont rendus par la base (`getLibraryGenres`). Les figer ici les ferait
   * diverger du jour où AniList en ajoute un. Le risque est nul côté requête : la valeur part dans
   * un `has` sur une colonne de tableau, donc un genre inventé dans l'URL ne rend rien plutôt que
   * d'élargir le périmètre.
   */
  genre: parseAsString,
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("recent"),
  /** Grille ou liste dense — la disposition est dans l'URL, donc partageable et rejouée au retour. */
  view: parseAsStringLiteral(VIEW_MODES).withDefault(DEFAULT_VIEW_MODE),
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
