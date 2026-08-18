import {
  createLoader,
  createParser,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { DEFAULT_VIEW_MODE, VIEW_MODES } from "@/config/catalogue";
import { formatSeason } from "@/features/media/lib/media-format";
import {
  recentSeasons,
  type SeasonSlot,
} from "@/features/media/lib/media-season";
import {
  type MediaSeason,
  mediaSeasonSchema,
} from "@/features/media/schemas/media.schema";
import {
  MAX_MEDIA_YEAR,
  MIN_MEDIA_YEAR,
  type SortDirection,
  type SortField,
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

/**
 * Les saisons, telles que l'URL les écrit. Reprises du schéma AniList plutôt que recopiées : une
 * liste tenue à deux endroits diverge, et celle-ci décide de ce que `?season=` accepte.
 */
const SEASON_VALUES = mediaSeasonSchema.options;

/**
 * Combien de trimestres le sélecteur de saison propose.
 *
 * Trois ans en arrière, plus la saison à venir. Au-delà, la liste devient un défilement dans lequel
 * on cherche une date au lieu de la choisir — et une saison de 2019 se trouve mieux par son titre
 * que par son trimestre.
 */
const SEASON_SLOT_COUNT = 13;

/**
 * Les créneaux proposés, **calculés au moment de l'appel**.
 *
 * Ce n'est pas une constante de module : elle serait figée à la saison du premier rendu du serveur,
 * et la liste annoncerait encore l'automne en janvier. Même raison que l'argument `season` de
 * `getBrowseCatalogue`, et l'appelant est ici le chargeur serveur de la barre de filtres, qui passe
 * le résultat à l'îlot client — le calcul ne traverse jamais la frontière, donc la saison du serveur
 * et celle du client ne peuvent pas diverger à l'hydratation.
 */
export function seasonSlotOptions(
  from: SeasonSlot,
): Array<{ value: string; label: string }> {
  return recentSeasons(SEASON_SLOT_COUNT, from).map((slot) => ({
    value: seasonSlotValue(slot),
    label: formatSeason(slot.season, slot.seasonYear) ?? "",
  }));
}

/**
 * Un créneau, vu de l'URL : `season` et `year` restent **deux paramètres distincts**.
 *
 * Les coller en un seul (`?saison=SUMMER-2026`) obligerait à réinventer un encodage, à le décoder
 * des deux côtés, et rendrait impossible une adresse qui ne porte que l'année — que le schéma
 * accepte déjà. Cette valeur composite ne sert donc qu'à la sélection dans un `FilterPopover`, qui
 * parle en chaînes ; elle ne quitte jamais le composant.
 */
export function seasonSlotValue({ season, seasonYear }: SeasonSlot): string {
  return `${season}:${seasonYear}`;
}

export function parseSeasonSlotValue(value: string): {
  season: MediaSeason | null;
  year: number | null;
} {
  const [season, year] = value.split(":");
  const parsedYear = Number(year);

  return {
    season: (SEASON_VALUES as readonly string[]).includes(season)
      ? (season as MediaSeason)
      : null,
    year: Number.isInteger(parsedYear) ? parsedYear : null,
  };
}

/**
 * L'année de diffusion, ramenée à `null` hors des bornes du schéma.
 *
 * `parseAsInteger` ne borne rien : `?year=0` traverserait le parseur, puis ferait échouer
 * `searchFormSchema` — et le repli de `SearchResults` remet alors **tous** les filtres à zéro. Une
 * année absurde effacerait donc le genre et le type saisis à côté d'elle. Borner ici garde le
 * ratage local, comme le fait déjà `parseAsStringLiteral` pour le tri et le statut.
 */
const parseAsBoundedYear = createParser({
  parse: (value: string) => {
    const year = parseAsInteger.parse(value);
    if (year === null) return null;

    return year >= MIN_MEDIA_YEAR && year <= MAX_MEDIA_YEAR ? year : null;
  },
  serialize: (value: number) => String(value),
});

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
  /**
   * La saison de diffusion et son année, **deux paramètres**, comme chez AniList.
   *
   * L'interface ne les écrit qu'ensemble (`seasonSlotValue`), mais les garder séparés laisse
   * `?year=2026` seul exprimer une année entière — ce que le schéma accepte déjà — sans inventer
   * une syntaxe de plus.
   *
   * Les bornes de `year` sont celles du schéma : sans elles, `?year=0` partirait chez AniList, et
   * `searchFormSchema` le rejetterait en bloc au lieu de le ramener à un défaut. Un parseur qui
   * borne rend l'URL tolérante là où le schéma est strict.
   */
  season: parseAsStringLiteral(SEASON_VALUES),
  year: parseAsBoundedYear,
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
  season: null;
  year: null;
  sort: SortField;
  dir: SortDirection;
  page: number;
} = {
  q: "",
  type: null,
  status: null,
  genre: [],
  tag: [],
  season: null,
  year: null,
  sort: "SEARCH_MATCH",
  dir: "DESC",
  page: 1,
};
