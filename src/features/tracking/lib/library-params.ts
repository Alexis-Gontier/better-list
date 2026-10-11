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
  { value: "added", label: "Date d'ajout" },
  { value: "title", label: "Titre" },
  { value: "score", label: "Ma note" },
  { value: "progress", label: "Progression" },
  { value: "started", label: "Date de début" },
  { value: "finished", label: "Date de fin" },
  { value: "year", label: "Année de sortie" },
  { value: "length", label: "Longueur" },
] as const;

export type LibrarySort = (typeof LIBRARY_SORT_OPTIONS)[number]["value"];

export type LibrarySortDirection = "ASC" | "DESC";

/**
 * Le sens que chaque tri prend **quand l'URL n'en dit rien**.
 *
 * Le titre se lit de A à Z ; tout le reste — dates, note, progression, année, longueur — se lit du
 * plus grand au plus petit, parce que c'est la question qu'on pose d'abord : la dernière, la mieux
 * notée, la plus longue. `dir` ne fait que renverser ce sens, il ne le définit pas : c'est ce qui
 * permet de changer de tri sans hériter d'un sens choisi pour le précédent.
 */
export const LIBRARY_SORT_DEFAULT_DIRECTION: Record<
  LibrarySort,
  LibrarySortDirection
> = {
  recent: "DESC",
  added: "DESC",
  title: "ASC",
  score: "DESC",
  progress: "DESC",
  started: "DESC",
  finished: "DESC",
  year: "DESC",
  length: "DESC",
};

/**
 * Le filtre 18+ de la barre — **un resserrement de la préférence, jamais un élargissement.**
 *
 * Absent, il laisse passer tout ce que `includeAdult` autorise. Il ne s'affiche que pour un compte
 * qui a ouvert le 18+ dans ses réglages : pour les autres, il n'est pas lu, et le contenu adulte
 * est écarté dans la requête quoi que dise l'URL.
 */
export const LIBRARY_ADULT_OPTIONS = [
  { value: "hide", label: "Sans 18+" },
  { value: "only", label: "Seulement 18+" },
] as const;

export type LibraryAdultFilter =
  (typeof LIBRARY_ADULT_OPTIONS)[number]["value"];

const STATUS_VALUES = LIBRARY_STATUS_ORDER.map((status) => status);
const TYPE_VALUES = LIBRARY_TYPE_OPTIONS.map((option) => option.value);
const SORT_VALUES = LIBRARY_SORT_OPTIONS.map((option) => option.value);
const DIRECTION_VALUES = ["ASC", "DESC"] as const satisfies readonly [
  LibrarySortDirection,
  ...LibrarySortDirection[],
];
const ADULT_VALUES = LIBRARY_ADULT_OPTIONS.map((option) => option.value);

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
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("recent"),
  /**
   * Le sens, **nul quand on garde celui du tri** (`LIBRARY_SORT_DEFAULT_DIRECTION`). Un défaut
   * unique (« DESC ») ferait lire les titres de Z à A dès qu'on choisit « Titre ».
   */
  dir: parseAsStringLiteral(DIRECTION_VALUES),
  adult: parseAsStringLiteral(ADULT_VALUES),
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

/** Le sens effectif d'un tri : celui de l'URL s'il y en a un, sinon celui du tri. */
export function resolveLibraryDirection(
  sort: LibrarySort,
  dir: LibrarySortDirection | null,
): LibrarySortDirection {
  return dir ?? LIBRARY_SORT_DEFAULT_DIRECTION[sort];
}
