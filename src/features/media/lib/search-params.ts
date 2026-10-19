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
import {
  formatCountry,
  formatGenre,
  formatMediaFormat,
  formatSeason,
} from "@/features/media/lib/media-format";
import {
  recentSeasons,
  type SeasonSlot,
} from "@/features/media/lib/media-season";
import {
  type MediaFormat,
  type MediaSeason,
  mediaCountrySchema,
  mediaFormatSchema,
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

/**
 * L'échelle de la note, **sur 100, comme AniList** — et son pas.
 *
 * `MAX_SCORE` est le plafond d'`averageScore` ; `SCORE_STEP` vaut un demi-point sur l'échelle
 * affichée. Les deux vivent ici plutôt que dans le composant parce que le parseur d'URL et le
 * curseur doivent s'accorder : un pas différent des deux côtés produit une valeur que l'adresse
 * accepte et que le contrôle ne sait pas représenter.
 */
export const MAX_SCORE = 100;
export const SCORE_STEP = 5;

export const STATUS_OPTIONS = [
  { value: "RELEASING", label: "En cours" },
  { value: "FINISHED", label: "Terminé" },
  { value: "NOT_YET_RELEASED", label: "À paraître" },
  { value: "HIATUS", label: "En pause" },
  { value: "CANCELLED", label: "Annulé" },
] as const;

/**
 * Les formats et les pays, **dérivés du schéma et étiquetés par les tables existantes**.
 *
 * Contrairement à `STATUS_OPTIONS`, qui est écrit à la main pour choisir son ordre, ces deux
 * listes n'ont pas d'ordre à défendre : elles reprennent celui de l'énumération. Les recopier
 * aurait créé une troisième liste de formats dans le dépôt — après le schéma Zod et la table de
 * libellés de `media-format.ts` — et c'est la troisième qui aurait été oubliée.
 *
 * Le repli `?? value` ne se déclenche jamais : les deux formateurs couvrent l'énumération entière.
 * Il est là parce qu'ils rendent `string | null` pour accepter une valeur absente, et une
 * assertion aurait fait taire le compilateur sans rien garantir de plus.
 */
export const FORMAT_OPTIONS = mediaFormatSchema.options.map((value) => ({
  value,
  label: formatMediaFormat(value) ?? value,
}));

export const COUNTRY_OPTIONS = mediaCountrySchema.options.map((value) => ({
  value,
  label: formatCountry(value) ?? value,
}));

/**
 * Les genres proposés en filtre — **la liste d'AniList moins `Hentai`**.
 *
 * Les valeurs sont celles d'AniList, telles qu'elles partent dans `genre_in` ; seuls les libellés
 * sont traduits (`formatGenre`). L'ordre est alphabétique en français, donc celui dans lequel on
 * les balaie du regard, et non celui de l'API.
 *
 * `Hentai` est retiré de la **liste de filtres**, pas de la table de libellés : proposer une puce
 * qui ne rend rien tant que la préférence 18+ est éteinte serait un piège, et le filtre `isAdult`
 * se dérive du compte côté serveur, jamais de l'URL (.claude/skills/anilist-read/references/recherche-filtres.md §1.2). Une fiche
 * classée `Hentai` continue, elle, de s'afficher avec son genre traduit.
 */
export const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
].map((value) => ({ value, label: formatGenre(value) }));

/**
 * Les quatre saisons, **seules** — l'année se règle en plage, plus en trimestre.
 *
 * `formatSeason(season, null)` rend le nom sans millésime : la table de libellés reste chez
 * `media-format.ts`, avec les autres, et n'a pas à être exposée pour ce seul usage.
 */
export const SEASON_OPTIONS = mediaSeasonSchema.options.map((value) => ({
  value,
  label: formatSeason(value, null) ?? value,
}));

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
  // Le défaut ne se déclenche jamais — `split` rend toujours au moins un élément — mais il dit au
  // type ce que l'exécution garantit déjà, sans assertion.
  const [season = "", year] = value.split(":");
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

/**
 * La note minimale, bornée à l'échelle d'AniList et alignée sur le pas du curseur.
 *
 * Même rôle que `parseAsBoundedYear` : une valeur absurde retombe à `null` au lieu de faire
 * échouer la validation et d'emporter les autres filtres. Le `% SCORE_STEP` en plus refuse une
 * valeur hors du pas — sans lui, `?score=73` forgée à la main créerait une clé de cache que
 * l'interface est incapable de reproduire, donc jamais réutilisée.
 */
const parseAsBoundedScore = createParser({
  parse: (value: string) => {
    const score = parseAsInteger.parse(value);
    if (score === null) return null;

    const inRange = score >= SCORE_STEP && score <= MAX_SCORE;
    return inRange && score % SCORE_STEP === 0 ? score : null;
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
const FORMAT_VALUES = FORMAT_OPTIONS.map((option) => option.value);
const COUNTRY_VALUES = COUNTRY_OPTIONS.map((option) => option.value);

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
  /**
   * Le format et le pays d'origine — **le schéma les acceptait déjà, l'URL ne les portait pas**.
   *
   * `searchMediaInputSchema` déclare `format` et `countryOfOrigin` depuis toujours, et
   * `SEARCH_MEDIA_QUERY` les passe à AniList : il ne manquait qu'un parseur pour qu'une adresse
   * puisse les exprimer. Les ajouter n'invalide aucun lien existant, un paramètre absent restant
   * un filtre absent.
   *
   * `country` et non `countryOfOrigin` : les clés sont visibles dans l'adresse, donc courtes. Le
   * nom long reste celui du schéma, qui parle à AniList et non à l'utilisateur.
   *
   * **`format` est une liste, `country` non**, et l'écart est voulu : « film ou spécial » est une
   * question qu'on se pose, « japonais ou coréen » beaucoup moins — c'est même l'inverse de ce
   * qu'on cherche quand on veut un webtoon. Les deux seraient possibles côté AniList (`format_in`,
   * `countryOfOrigin_in`) ; seul le premier est ouvert, et il l'est de bout en bout — le document
   * envoie `format_in`, le schéma d'entrée déclare `formats`.
   *
   * `type` restera au singulier quoi qu'il arrive : `Page.media` n'a pas de `type_in`.
   */
  format: parseAsArrayOf(parseAsStringLiteral(FORMAT_VALUES)).withDefault([]),
  country: parseAsStringLiteral(COUNTRY_VALUES),
  /**
   * La plage d'années, **et non `seasonYear`**.
   *
   * C'est la sortie du piège documenté plus haut : la doc d'AniList dit que `seasonYear` « requires
   * season argument », donc une année seule n'est pas garantie. `startDate_greater` /
   * `startDate_lesser` n'ont pas cette dépendance, acceptent un intervalle — ce qu'un curseur à
   * deux poignées demande — et laissent `season` filtrer le trimestre de son côté, sans millésime.
   *
   * Deux paramètres et non un intervalle encodé : `?yearMin=2020&yearMax=2026` se lit dans une
   * adresse, se corrige à la main, et évite d'inventer une syntaxe que les deux bords devraient
   * décoder.
   *
   * Bornés comme `year`, et pour la même raison : hors bornes, une valeur retombe à `null` sans
   * emporter les filtres saisis à côté d'elle.
   */
  yearMin: parseAsBoundedYear,
  yearMax: parseAsBoundedYear,
  /**
   * La note minimale de la communauté, **sur 100 comme chez AniList** (`averageScore_greater`).
   *
   * L'écran affiche « 7,0 » parce qu'une note sur dix se lit mieux, mais l'URL porte `70` : tout le
   * dépôt compte les notes sur 100 (`mediaSchema.averageScore`, `Entry.score`), et convertir à la
   * frontière plutôt que dans l'adresse évite qu'un paramètre ait une échelle à lui.
   *
   * Le pas est de 5 — soit un demi-point à l'écran. C'est le compromis du « prix d'un filtre » :
   * au point près, cette seule facette multiplierait par cent les clés de cache de la recherche.
   */
  score: parseAsBoundedScore,
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
  format: MediaFormat[];
  country: null;
  genre: string[];
  tag: string[];
  season: null;
  year: null;
  yearMin: null;
  yearMax: null;
  score: null;
  sort: SortField;
  dir: SortDirection;
  page: number;
} = {
  q: "",
  type: null,
  status: null,
  format: [],
  country: null,
  genre: [],
  tag: [],
  season: null,
  year: null,
  yearMin: null,
  yearMax: null,
  score: null,
  sort: "SEARCH_MATCH",
  dir: "DESC",
  page: 1,
};

/**
 * Les filtres du catalogue tels que la page les reçoit.
 *
 * Dérivé du **loader** et non de `EMPTY_FILTERS`, dont les valeurs par défaut sont annotées `null`
 * littéral : ce type-là dirait qu'un type d'œuvre ne peut jamais valoir `"ANIME"`.
 */
export type SearchFilters = Awaited<ReturnType<typeof loadSearchFilters>>;

/**
 * Les seules clés qui **filtrent** le catalogue.
 *
 * Énumérées plutôt que soustraites de `SearchFilters` : `q` est la question posée, `sort`, `dir`,
 * `page` et `view` la façon de la présenter, et une clé de présentation ajoutée demain se
 * retrouverait sinon comptée comme une facette sans que rien ne le signale.
 */
export type SearchFacets = Pick<
  SearchFilters,
  | "type"
  | "status"
  | "format"
  | "country"
  | "genre"
  | "tag"
  | "season"
  | "year"
  | "yearMin"
  | "yearMax"
  | "score"
>;

export type FacetKey = keyof SearchFacets;

export type SelectiveFacet = {
  /** Les clés à remettre à leur défaut pour retirer la facette. */
  keys: FacetKey[];
  /** Comment la nommer dans une phrase : « Essayez sans **le tag « Time Loop »** ». */
  label: string;
};

/**
 * La facette active la plus étroite, ou `null` s'il n'y en a aucune.
 *
 * Elle sert l'état « aucun résultat, filtres actifs » de .claude/skills/anilist-read/references/recherche-filtres.md §5, qui demande
 * de **proposer un geste** plutôt que d'annoncer « rien trouvé ». Proposer de tout effacer ferait
 * perdre un panneau qu'on vient de remplir ; proposer la facette la plus étroite retire d'abord
 * celle qui a le plus de chances d'être seule responsable du vide.
 *
 * **L'ordre est un jugement, pas une mesure** — on ne compte rien côté serveur pour l'établir, ce
 * qui coûterait une requête AniList par facette sur un quota de trente par minute. Il va du plus
 * étroit au plus large : un tag ne couvre qu'une poignée d'œuvres, une saison trois mois, un type
 * la moitié du catalogue. Le terme de recherche, lui, n'en fait pas partie : il n'est pas une
 * facette mais la question posée, et l'effacer changerait de recherche au lieu de l'élargir.
 *
 * `season` et `year` d'un côté, `yearMin` et `yearMax` de l'autre, sont **groupées** : ce sont deux
 * moitiés d'un même réglage, et n'en retirer qu'une laisserait un filtre à moitié posé.
 */
export function mostSelectiveFacet(
  filters: SearchFacets,
): SelectiveFacet | null {
  const plural = (values: string[], one: string, many: string) =>
    values.length === 1 && values[0]
      ? `${one} « ${values[0]} »`
      : `les ${values.length} ${many}`;

  if (filters.tag.length > 0) {
    return { keys: ["tag"], label: plural(filters.tag, "le tag", "tags") };
  }

  if (filters.season !== null || filters.year !== null) {
    return { keys: ["season", "year"], label: "la saison" };
  }

  if (filters.yearMin !== null || filters.yearMax !== null) {
    return { keys: ["yearMin", "yearMax"], label: "la plage d'années" };
  }

  if (filters.score !== null) {
    return { keys: ["score"], label: "la note minimale" };
  }

  if (filters.genre.length > 0) {
    return {
      keys: ["genre"],
      label: plural(filters.genre, "le genre", "genres"),
    };
  }

  if (filters.country !== null) {
    return { keys: ["country"], label: "le pays d'origine" };
  }

  if (filters.format.length > 0) {
    return {
      keys: ["format"],
      label:
        filters.format.length === 1
          ? "le format"
          : `les ${filters.format.length} formats`,
    };
  }

  if (filters.status !== null) {
    return { keys: ["status"], label: "le statut" };
  }

  if (filters.type !== null) {
    return { keys: ["type"], label: "le type" };
  }

  return null;
}
