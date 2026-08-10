import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { DEFAULT_VIEW_MODE, VIEW_MODES } from "@/config/catalogue";
import type {
  SortDirection,
  SortField,
} from "@/features/media/schemas/search-media.schema";

/**
 * Paramètres d'URL de la recherche — **source unique, client et serveur**.
 *
 * L'URL est la source de vérité de la recherche : elle est partageable, le bouton retour la défait,
 * et le rendu serveur reçoit exactement ce que l'utilisateur voit.
 *
 * Les parseurs viennent de `nuqs/server`, qui est isomorphe : la barre de filtres les utilise via
 * `useQueryStates` pour **écrire** l'URL, et le composant de résultats via `loadSearchFilters` pour
 * la **lire**. Décoder les paramètres à la main côté serveur reviendrait à réimplémenter la
 * sérialisation de nuqs — et à la voir diverger au premier changement de séparateur.
 *
 * `searchFormSchema` reste l'autorité sur ce qu'AniList accepte (bornes, longueurs, énumérations).
 * Ces parseurs décrivent la forme de l'URL, pas les règles métier.
 *
 * Les clés sont courtes (`q`, `dir`, `genre`) parce qu'elles sont visibles dans l'adresse.
 */

export const SORT_OPTIONS: Array<{ value: SortField; label: string }> = [
  { value: "SEARCH_MATCH", label: "Pertinence" },
  { value: "POPULARITY", label: "Popularité" },
  { value: "SCORE", label: "Note" },
  { value: "TRENDING", label: "Tendances" },
  { value: "FAVOURITES", label: "Favoris" },
  { value: "START_DATE", label: "Dernières sorties" },
  { value: "TITLE_ROMAJI", label: "Titre" },
];

export const TYPE_OPTIONS = [
  { value: "ANIME", label: "Animes" },
  { value: "MANGA", label: "Mangas" },
] as const;

export const STATUS_OPTIONS = [
  { value: "RELEASING", label: "En cours" },
  { value: "FINISHED", label: "Terminé" },
  { value: "NOT_YET_RELEASED", label: "À paraître" },
  { value: "HIATUS", label: "En pause" },
  { value: "CANCELLED", label: "Annulé" },
] as const;

const SORT_VALUES = SORT_OPTIONS.map((option) => option.value) as [
  SortField,
  ...SortField[],
];
const DIRECTION_VALUES = ["ASC", "DESC"] as const satisfies readonly [
  SortDirection,
  ...SortDirection[],
];
const TYPE_VALUES = TYPE_OPTIONS.map((option) => option.value);
const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);

/**
 * Le tri servi quand aucun terme n'est saisi.
 *
 * `SEARCH_MATCH` classe par **proximité avec la requête** : sans requête, il n'a rien à comparer et
 * AniList retombe sur son ordre interne — une page d'arrivée qui ouvre sur des œuvres au hasard.
 * « Tendances » répond à la seule question qu'on puisse poser sans avoir rien tapé : qu'est-ce qui
 * se regarde en ce moment.
 */
export const EMPTY_QUERY_SORT = "TRENDING" satisfies SortField;

/**
 * Le tri **effectif**, qui n'est pas toujours celui de l'URL.
 *
 * La substitution est volontairement étroite : elle ne s'applique qu'au tri par défaut, jamais à un
 * tri choisi. Quelqu'un qui demande « Titre » sans terme de recherche obtient bien un ordre
 * alphabétique — ce n'est pas à nous de décider qu'il s'est trompé.
 *
 * Pure et partagée client/serveur : la barre de filtres affiche ce que la grille sert, sans quoi le
 * sélecteur annoncerait « Pertinence » au-dessus de résultats classés par tendance.
 */
export function resolveSort({
  q,
  sort,
}: {
  q: string;
  sort: SortField;
}): SortField {
  return sort === "SEARCH_MATCH" && !q.trim() ? EMPTY_QUERY_SORT : sort;
}

export const searchFilterParsers = {
  q: parseAsString.withDefault(""),
  type: parseAsStringLiteral(TYPE_VALUES),
  status: parseAsStringLiteral(STATUS_VALUES),
  /** Listes séparées par des virgules : `?genre=Action,Comedy` reste lisible. */
  genre: parseAsArrayOf(parseAsString).withDefault([]),
  tag: parseAsArrayOf(parseAsString).withDefault([]),
  sort: parseAsStringLiteral(SORT_VALUES).withDefault("SEARCH_MATCH"),
  dir: parseAsStringLiteral(DIRECTION_VALUES).withDefault("DESC"),
  /**
   * Grille ou liste dense. **Ne fait pas partie de ce qui part chez AniList** : `searchFormSchema`
   * ne le connaît pas, donc changer de disposition ne change pas la clé de cache de la requête et
   * ne dépense rien du quota.
   */
  view: parseAsStringLiteral(VIEW_MODES).withDefault(DEFAULT_VIEW_MODE),
  page: parseAsInteger.withDefault(1),
};

/**
 * Lecture des filtres depuis les `searchParams` d'une page.
 *
 * Accepte la promesse directement, et retombe sur les valeurs par défaut d'un parseur quand la
 * valeur reçue est invalide — un `?page=abc` produit donc la page 1, pas une erreur.
 */
export const loadSearchFilters = createLoader(searchFilterParsers);

/**
 * Construction d'une URL de recherche à partir de valeurs de filtres.
 *
 * Utilisé par la pagination : bâtir l'adresse de la page voisine avec les mêmes parseurs garantit
 * qu'elle sera relue à l'identique, et les valeurs par défaut sont omises automatiquement.
 */
export const serializeSearchFilters = createSerializer(searchFilterParsers);

/** Valeurs remises à zéro par le bouton de réinitialisation. */
export const EMPTY_FILTERS: {
  q: string;
  type: null;
  status: null;
  genre: string[];
  tag: string[];
  sort: SortField;
  dir: SortDirection;
  page: number;
} = {
  q: "",
  type: null,
  status: null,
  genre: [],
  tag: [],
  sort: "SEARCH_MATCH",
  dir: "DESC",
  page: 1,
};
