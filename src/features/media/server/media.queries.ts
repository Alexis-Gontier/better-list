import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  AIRING_SCHEDULE_QUERY,
  BROWSE_CATALOGUE_QUERY,
  FILTER_VOCABULARY_QUERY,
  MEDIA_BY_ID_QUERY,
  SEARCH_MEDIA_QUERY,
} from "@/features/media/lib/media-documents";
import { nextSeason, type SeasonSlot } from "@/features/media/lib/media-season";
import {
  type AiringSchedule,
  airingScheduleDataSchema,
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
};

/**
 * Le catalogue éditorialisé de `/browse` (docs/PRODUCT.md §5, V1).
 *
 * **Quatre rangées, une requête.** Le document GraphQL aligne quatre champs `Page` sous des alias
 * distincts, et c'est le quota qui l'impose : quatre lectures séparées prendraient quatre crédits sur
 * les trente de la minute, partagés par tous les visiteurs. La page entière en coûte un — et zéro dès la
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
  };
}

/** Le maximum qu'AniList sert en une fois sur `Page`. */
const AIRING_PER_PAGE = 50;

/**
 * Combien de pages on accepte de payer pour une semaine.
 *
 * Cent cinquante diffusions en sept jours, c'est déjà une bibliothèque qui suit une vingtaine de
 * séries quotidiennes. Au-delà, mieux vaut une semaine tronquée qu'une boucle qui vide le quota :
 * la borne est là pour qu'une bibliothèque hors norme ne puisse pas mettre la page de tout le monde
 * en panne.
 */
const AIRING_MAX_PAGES = 3;

/**
 * Le planning de diffusion d'un ensemble d'œuvres, sur une fenêtre de temps.
 *
 * **Les ids sont un argument, pas un filtre appliqué après coup**, et c'est ce qui distingue cette
 * lecture des autres du fichier. Une semaine de diffusion complète, c'est cinq mille entrées chez
 * AniList (mesuré) : la ramener pour n'en garder que trente serait cent requêtes sur un quota de
 * trente par minute. Le filtre appartient donc à la requête.
 *
 * La contrepartie est une entrée de cache par ensemble d'œuvres suivies, là où le reste du fichier
 * n'en a qu'une pour tout le monde. Elle est assumée — le cercle compte quatre comptes
 * (docs/PRODUCT.md §2) — et **les ids sont triés** pour que deux membres qui suivent les mêmes
 * séries partagent l'entrée : la clé de cache est la sérialisation des arguments, donc l'ordre
 * d'arrivée des lignes de la base en ferait sinon deux entrées pour une seule réponse.
 *
 * Une bibliothèque sans œuvre en cours de diffusion **ne part pas du tout** chez AniList : c'est le
 * cas d'un compte neuf, et lui faire payer une requête pour recevoir une liste vide serait absurde.
 */
export async function getAiringSchedule({
  mediaIds,
  from,
  to,
}: {
  mediaIds: number[];
  /** Début de la fenêtre, en secondes Unix. Inclus. */
  from: number;
  /** Fin de la fenêtre, en secondes Unix. Exclue. */
  to: number;
}): Promise<AiringSchedule[]> {
  if (mediaIds.length === 0) return [];

  return getAiringScheduleCached({
    mediaIds: [...mediaIds].sort((a, b) => a - b),
    from,
    to,
  });
}

async function getAiringScheduleCached({
  mediaIds,
  from,
  to,
}: {
  mediaIds: number[];
  from: number;
  to: number;
}): Promise<AiringSchedule[]> {
  "use cache";
  // La grille horaire est la donnée la plus volatile qu'on lise : un report d'épisode est annoncé
  // le jour même, parfois dans l'heure. C'est la seule lecture du fichier qui descende à la minute.
  cacheLife("minutes");
  cacheTag(MEDIA_CACHE_TAG);

  const schedules: AiringSchedule[] = [];

  for (let page = 1; page <= AIRING_MAX_PAGES; page++) {
    const data = await anilistQuery({
      query: AIRING_SCHEDULE_QUERY,
      variables: {
        mediaIds,
        // Les deux filtres d'AniList sont **exclusifs**. La fenêtre, elle, est donnée bornes
        // ouvertes à droite (`[from, to[`) comme partout ailleurs dans le projet : on décale donc
        // `from` d'une seconde pour ne pas perdre une diffusion pile à minuit — il en existe.
        from: from - 1,
        to,
        page,
        perPage: AIRING_PER_PAGE,
      },
      schema: airingScheduleDataSchema,
    });

    schedules.push(...data.Page.airingSchedules);

    if (!data.Page.pageInfo.hasNextPage) break;
  }

  return schedules;
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
