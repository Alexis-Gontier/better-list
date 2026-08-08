import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  BROWSE_CATALOGUE_QUERY,
  FILTER_VOCABULARY_QUERY,
  MEDIA_BY_ID_QUERY,
  SEARCH_MEDIA_QUERY,
} from "@/features/media/lib/media-documents";
import { nextSeason, type SeasonSlot } from "@/features/media/lib/media-season";
import {
  browseCatalogueDataSchema,
  filterVocabularyDataSchema,
  type Media,
  type MediaBrowse,
  type MediaDetail,
  type MediaSeason,
  type MediaTagOption,
  mediaByIdDataSchema,
  type PageInfo,
  searchMediaDataSchema,
} from "@/features/media/schemas/media.schema";
import {
  type SearchMediaInput,
  type SearchMediaParams,
  searchMediaInputSchema,
  toAniListSort,
} from "@/features/media/schemas/search-media.schema";
import { anilistQuery, isAniListError } from "@/lib/http/anilist";

/**
 * Lectures AniList du domaine `media`.
 *
 * C'est ici, et nulle part ailleurs, que le cache est posé. AniList plafonne à 30 requêtes par
 * minute et par IP : côté serveur ce budget est partagé par tous les visiteurs, donc une lecture
 * non mise en cache est un incident en puissance. Chaque `"use cache"` transforme N visiteurs en
 * une requête par fenêtre de revalidation.
 *
 * Deux règles tiennent ce fichier :
 *
 * - **La validation d'entrée est hors du cache.** La clé de cache est la sérialisation des
 *   arguments : si les défauts étaient appliqués à l'intérieur, `{ search: "x" }` et
 *   `{ search: "x", page: 1 }` créeraient deux entrées pour le même résultat.
 * - **Le filtrage lié à l'utilisateur est hors du cache.** L'entrée mémorisée est la donnée
 *   AniList brute ; la préférence 18+ s'applique après, sinon on duplique le cache par
 *   préférence.
 */

/** Tag global des lectures AniList : `revalidateTag` ici purge tout le catalogue. */
export const MEDIA_CACHE_TAG = "media";

/** Tag d'une fiche précise, pour n'invalider qu'un média. */
export function mediaCacheTag(id: number) {
  return `media:${id}`;
}

export type SearchMediaResult = {
  pageInfo: PageInfo;
  media: Media[];
};

/**
 * Recherche dans le catalogue AniList (animes, mangas, webtoons…).
 *
 * Le filtre 18+ est appliqué ici, côté serveur : sauf `includeAdult`, `isAdult: false` part dans
 * la requête et les médias adultes ne quittent jamais l'API.
 */
export async function searchMedia(
  input: SearchMediaInput,
): Promise<SearchMediaResult> {
  return searchMediaCached(searchMediaInputSchema.parse(input));
}

async function searchMediaCached(
  params: SearchMediaParams,
): Promise<SearchMediaResult> {
  "use cache";
  // Le catalogue bouge lentement ; les classements (tendances, popularité) au rythme de
  // quelques mises à jour par jour. `hours` couvre les deux sans laisser filer la fraîcheur.
  cacheLife("hours");
  cacheTag(MEDIA_CACHE_TAG);

  const { includeAdult, sortField, sortDirection, ...variables } = params;

  const data = await anilistQuery({
    query: SEARCH_MEDIA_QUERY,
    variables: {
      ...variables,
      // Le tri est exposé en champ + direction ; AniList attend l'énumération recomposée.
      sort: toAniListSort(sortField, sortDirection),
      // `undefined` → variable omise → AniList renvoie les deux classifications.
      isAdult: includeAdult ? undefined : false,
    },
    schema: searchMediaDataSchema,
  });

  return { pageInfo: data.Page.pageInfo, media: data.Page.media };
}

export type BrowseCatalogue = {
  /** Ce que la communauté regarde en ce moment. */
  trending: MediaBrowse[];
  /** La saison en cours, par popularité. */
  season: MediaBrowse[];
  /** La saison suivante — vide en début de saison, AniList remplissant les fiches au fil des annonces. */
  upcoming: MediaBrowse[];
  /** Les mieux notés, hors œuvres non diffusées. */
  topRated: MediaBrowse[];
  /** Mangas, webtoons et light novels du moment. */
  topManga: MediaBrowse[];
};

/**
 * Le catalogue éditorialisé de `/browse` (docs/PRODUCT.md §5, V1).
 *
 * **Cinq rangées, une requête.** Le document GraphQL aligne cinq champs `Page` sous des alias
 * distincts, et c'est le quota qui l'impose : cinq lectures séparées prendraient cinq crédits sur les
 * trente de la minute, partagés par tous les visiteurs. La page entière en coûte un — et zéro dès la
 * deuxième visite dans l'heure.
 *
 * La saison est un **argument**, pas une lecture faite à l'intérieur du cache. `currentSeason()` change
 * de valeur quatre fois par an : la lire dans la fonction cachée y figerait la saison du premier
 * remplissage jusqu'à expiration, et le 1er janvier la page annoncerait encore l'automne.
 *
 * `includeAdult` entre en revanche dans la clé de cache, comme pour `searchMedia` : il change la requête
 * envoyée à AniList, donc il ne peut pas s'appliquer après coup. Le compte des entrées reste borné à
 * deux, une par valeur du booléen.
 */
export async function getBrowseCatalogue({
  season,
  seasonYear,
  includeAdult = false,
}: SeasonSlot & { includeAdult?: boolean }): Promise<BrowseCatalogue> {
  const upcoming = nextSeason({ season, seasonYear });

  return getBrowseCatalogueCached({
    season,
    seasonYear,
    nextSeason: upcoming.season,
    nextSeasonYear: upcoming.seasonYear,
    includeAdult,
  });
}

async function getBrowseCatalogueCached({
  includeAdult,
  ...variables
}: {
  season: MediaSeason;
  seasonYear: number;
  nextSeason: MediaSeason;
  nextSeasonYear: number;
  includeAdult: boolean;
}): Promise<BrowseCatalogue> {
  "use cache";
  // Les tendances bougent dans la journée, les classements plus lentement, la saison pas du tout. La
  // rangée la plus volatile commande, et `hours` est ce qui la garde honnête sans repayer la requête à
  // chaque visite.
  cacheLife("hours");
  cacheTag(MEDIA_CACHE_TAG);

  const data = await anilistQuery({
    query: BROWSE_CATALOGUE_QUERY,
    variables: {
      ...variables,
      // `undefined` → variable omise → AniList renvoie les deux classifications.
      isAdult: includeAdult ? undefined : false,
    },
    schema: browseCatalogueDataSchema,
  });

  return {
    trending: data.trending.media,
    season: data.season.media,
    upcoming: data.upcoming.media,
    topRated: data.topRated.media,
    topManga: data.topManga.media,
  };
}

export type FilterVocabulary = {
  genres: string[];
  tags: MediaTagOption[];
};

/**
 * Genres et tags proposés dans les filtres.
 *
 * Vocabulaire quasi statique — AniList y ajoute un tag de temps en temps, jamais dans la journée.
 * D'où un cache long : sans lui, chaque affichage de la barre de filtres coûterait une requête sur
 * un quota de 30 par minute partagé par tous les visiteurs.
 *
 * Les tags marqués adultes sont retirés **hors du cache**, pour ne pas dupliquer l'entrée
 * mémorisée par préférence utilisateur — même règle que le reste du fichier.
 */
export async function getFilterVocabulary({
  includeAdult = false,
}: {
  includeAdult?: boolean;
} = {}): Promise<FilterVocabulary> {
  const { genres, tags } = await getFilterVocabularyCached();

  return {
    genres,
    tags: includeAdult ? tags : tags.filter((tag) => !tag.isAdult),
  };
}

async function getFilterVocabularyCached(): Promise<FilterVocabulary> {
  "use cache";
  cacheLife("days");
  cacheTag(MEDIA_CACHE_TAG);

  const data = await anilistQuery({
    query: FILTER_VOCABULARY_QUERY,
    schema: filterVocabularyDataSchema,
  });

  return {
    // AniList laisse des `null` dans `GenreCollection`.
    genres: data.GenreCollection.filter(
      (genre): genre is string => genre !== null,
    ),
    tags: [...data.MediaTagCollection].sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    ),
  };
}

/**
 * Récupère une fiche par son id AniList.
 *
 * Renvoie `null` quand l'id n'existe pas (404 AniList) ou quand le média est adulte et que le
 * mode adulte est éteint — une recherche par id ne peut pas être filtrée côté API.
 */
export async function getMediaById(
  id: number,
  { includeAdult = false }: { includeAdult?: boolean } = {},
): Promise<MediaDetail | null> {
  const media = await getMediaByIdCached(id);

  if (!media) return null;
  if (media.isAdult && !includeAdult) return null;

  return media;
}

async function getMediaByIdCached(id: number): Promise<MediaDetail | null> {
  "use cache";
  // Une fiche ne bouge qu'à la marge une fois la diffusion terminée ; les notes évoluent
  // lentement. On paie donc une requête par média et par jour, au pire.
  cacheLife("days");
  cacheTag(MEDIA_CACHE_TAG, mediaCacheTag(id));

  try {
    const data = await anilistQuery({
      query: MEDIA_BY_ID_QUERY,
      variables: { id },
      schema: mediaByIdDataSchema,
    });

    return data.Media;
  } catch (error) {
    // Un id inconnu est une réponse, pas une panne : on mémorise le `null` plutôt que de
    // rejouer la requête à chaque visite d'une URL erronée.
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}
