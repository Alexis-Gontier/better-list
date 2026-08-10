import * as z from "zod";

/**
 * Source unique des formes de données AniList.
 *
 * Ces schémas valident les réponses à la frontière du domaine, et leurs types sont dérivés par
 * `z.infer` — on ne redéclare jamais une forme AniList ailleurs.
 *
 * Référence : https://docs.anilist.co
 */

// --- Énumérations (calquées sur les enums GraphQL d'AniList) ----------------

export const mediaTypeSchema = z.enum(["ANIME", "MANGA"]);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const mediaFormatSchema = z.enum([
  "TV",
  "TV_SHORT",
  "MOVIE",
  "SPECIAL",
  "OVA",
  "ONA",
  "MUSIC",
  "MANGA",
  "NOVEL",
  "ONE_SHOT",
]);
export type MediaFormat = z.infer<typeof mediaFormatSchema>;

export const mediaStatusSchema = z.enum([
  "FINISHED",
  "RELEASING",
  "NOT_YET_RELEASED",
  "CANCELLED",
  "HIATUS",
]);
export type MediaStatus = z.infer<typeof mediaStatusSchema>;

export const mediaSeasonSchema = z.enum(["WINTER", "SPRING", "SUMMER", "FALL"]);
export type MediaSeason = z.infer<typeof mediaSeasonSchema>;

/**
 * `countryOfOrigin` est un code ISO 3166-1 alpha-2. On n'expose que ceux qui servent à filtrer :
 * JP (manga), KR (manhwa/webtoon), CN (manhua), TW. Un pornhwa n'est pas un champ mais une
 * combinaison : MANGA + KR + `isAdult`.
 */
export const mediaCountrySchema = z.enum(["JP", "KR", "CN", "TW"]);
export type MediaCountry = z.infer<typeof mediaCountrySchema>;

/** Sous-ensemble de `MediaSort` exposé. Utilisé en entrée seulement. */
export const mediaSortSchema = z.enum([
  "SEARCH_MATCH",
  "POPULARITY_DESC",
  "POPULARITY",
  "SCORE_DESC",
  "SCORE",
  "TRENDING_DESC",
  "FAVOURITES_DESC",
  "START_DATE_DESC",
  "UPDATED_AT_DESC",
  "TITLE_ROMAJI",
]);
export type MediaSort = z.infer<typeof mediaSortSchema>;

// --- Media -----------------------------------------------------------------

export const mediaTitleSchema = z.object({
  romaji: z.string().nullable(),
  english: z.string().nullable(),
  native: z.string().nullable(),
  userPreferred: z.string().nullable(),
});
export type MediaTitle = z.infer<typeof mediaTitleSchema>;

export const mediaCoverImageSchema = z.object({
  extraLarge: z.string().nullable(),
  large: z.string().nullable(),
  medium: z.string().nullable(),
  color: z.string().nullable(),
});
export type MediaCoverImage = z.infer<typeof mediaCoverImageSchema>;

export const fuzzyDateSchema = z.object({
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
  day: z.number().int().nullable(),
});

export const mediaSchema = z.object({
  id: z.number().int(),
  type: mediaTypeSchema,
  format: mediaFormatSchema.nullable(),
  status: mediaStatusSchema.nullable(),
  description: z.string().nullable(),
  season: mediaSeasonSchema.nullable(),
  seasonYear: z.number().int().nullable(),
  episodes: z.number().int().nullable(),
  chapters: z.number().int().nullable(),
  volumes: z.number().int().nullable(),
  countryOfOrigin: z.string().nullable(),
  isAdult: z.boolean(),
  /** AniList note déjà sur 100. */
  averageScore: z.number().int().nullable(),
  meanScore: z.number().int().nullable(),
  genres: z.array(z.string()),
  coverImage: mediaCoverImageSchema.nullable(),
  bannerImage: z.string().nullable(),
  title: mediaTitleSchema,
  siteUrl: z.string().nullable(),
  startDate: fuzzyDateSchema.nullable(),
  endDate: fuzzyDateSchema.nullable(),
});
export type Media = z.infer<typeof mediaSchema>;

// --- Fiche détaillée -------------------------------------------------------
// Champs sélectionnés uniquement par la query par id. Chaque champ a un `default` pour que le
// schéma survive à une omission d'AniList.

const nameSchema = z.object({ full: z.string().nullable() });
const personImageSchema = z.object({ large: z.string().nullable() }).nullable();

export const mediaRankingSchema = z.object({
  rank: z.number().int(),
  type: z.enum(["RATED", "POPULAR"]),
  format: mediaFormatSchema.nullable(),
  year: z.number().int().nullable(),
  season: mediaSeasonSchema.nullable(),
  allTime: z.boolean().nullable(),
  context: z.string(),
});
export type MediaRanking = z.infer<typeof mediaRankingSchema>;

export const nextAiringEpisodeSchema = z.object({
  episode: z.number().int(),
  airingAt: z.number().int(),
  timeUntilAiring: z.number().int(),
});

export const mediaTrailerSchema = z.object({
  id: z.string().nullable(),
  site: z.string().nullable(),
  thumbnail: z.string().nullable(),
});

export const mediaTagSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  rank: z.number().int().nullable(),
  isMediaSpoiler: z.boolean().nullable(),
  isGeneralSpoiler: z.boolean().nullable(),
  isAdult: z.boolean().nullable(),
});
export type MediaTag = z.infer<typeof mediaTagSchema>;

/**
 * Distribution des notes de la communauté. `score` est un palier sur 100 (10, 20, … 100), pas la
 * note d'un utilisateur : AniList agrège avant d'exposer.
 */
export const scoreDistributionSchema = z.object({
  score: z.number().int(),
  amount: z.number().int(),
});
export type ScoreDistribution = z.infer<typeof scoreDistributionSchema>;

/**
 * Répartition des statuts de suivi. L'énumération est `MediaListStatus`, la même que celle qu'on
 * a recopiée dans `EntryStatus` (docs/PRODUCT.md §4.2) — un import AniList reste une
 * correspondance triviale, et le libellé se partage.
 */
export const statusDistributionSchema = z.object({
  status: z.enum([
    "CURRENT",
    "PLANNING",
    "COMPLETED",
    "DROPPED",
    "PAUSED",
    "REPEATING",
  ]),
  amount: z.number().int(),
});
export type StatusDistribution = z.infer<typeof statusDistributionSchema>;

/**
 * AniList laisse des `null` **dans** ces tableaux, pas seulement autour : d'où le `nullable()` sur
 * l'élément, filtré à la lecture plutôt que rejeté à la validation.
 */
export const mediaStatsSchema = z.object({
  scoreDistribution: z.array(scoreDistributionSchema.nullable()).default([]),
  statusDistribution: z.array(statusDistributionSchema.nullable()).default([]),
});

/** Un épisode chez un diffuseur. Les quatre champs sont facultatifs côté AniList. */
export const streamingEpisodeSchema = z.object({
  title: z.string().nullable(),
  thumbnail: z.string().nullable(),
  url: z.string().nullable(),
  site: z.string().nullable(),
});

export const externalLinkSchema = z.object({
  id: z.number().int(),
  site: z.string(),
  url: z.string().nullable(),
  type: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
});

export const studioEdgeSchema = z.object({
  isMain: z.boolean(),
  node: z.object({ id: z.number().int(), name: z.string() }),
});

export const characterEdgeSchema = z.object({
  role: z.string().nullable(),
  node: z.object({
    id: z.number().int(),
    name: nameSchema,
    image: personImageSchema,
  }),
  voiceActors: z
    .array(
      z.object({
        id: z.number().int(),
        name: nameSchema,
        image: personImageSchema,
        languageV2: z.string().nullable(),
      }),
    )
    .default([]),
});

export const staffEdgeSchema = z.object({
  role: z.string().nullable(),
  node: z.object({
    id: z.number().int(),
    name: nameSchema,
    image: personImageSchema,
  }),
});

/** Media allégé, utilisé dans les relations et recommandations (même carte que la liste). */
export const mediaCompactSchema = z.object({
  id: z.number().int(),
  type: mediaTypeSchema,
  format: mediaFormatSchema.nullable(),
  status: mediaStatusSchema.nullable(),
  averageScore: z.number().int().nullable(),
  isAdult: z.boolean(),
  title: mediaTitleSchema,
  coverImage: mediaCoverImageSchema.nullable(),
});
export type MediaCompact = z.infer<typeof mediaCompactSchema>;

export const relationEdgeSchema = z.object({
  relationType: z.string().nullable(),
  node: mediaCompactSchema,
});

export const recommendationNodeSchema = z.object({
  rating: z.number().int().nullable(),
  mediaRecommendation: mediaCompactSchema.nullable(),
});

export const mediaDetailSchema = mediaSchema.extend({
  idMal: z.number().int().nullable().default(null),
  duration: z.number().int().nullable().default(null),
  source: z.string().nullable().default(null),
  popularity: z.number().int().nullable().default(null),
  favourites: z.number().int().nullable().default(null),
  synonyms: z.array(z.string()).default([]),
  stats: mediaStatsSchema.nullable().default(null),
  streamingEpisodes: z.array(streamingEpisodeSchema).default([]),
  trailer: mediaTrailerSchema.nullable().default(null),
  nextAiringEpisode: nextAiringEpisodeSchema.nullable().default(null),
  rankings: z.array(mediaRankingSchema).default([]),
  tags: z.array(mediaTagSchema).default([]),
  externalLinks: z.array(externalLinkSchema).default([]),
  studios: z
    .object({ edges: z.array(studioEdgeSchema).default([]) })
    .default({ edges: [] }),
  characters: z
    .object({ edges: z.array(characterEdgeSchema).default([]) })
    .default({ edges: [] }),
  staff: z
    .object({ edges: z.array(staffEdgeSchema).default([]) })
    .default({ edges: [] }),
  relations: z
    .object({ edges: z.array(relationEdgeSchema).default([]) })
    .default({ edges: [] }),
  recommendations: z
    .object({ nodes: z.array(recommendationNodeSchema).default([]) })
    .default({ nodes: [] }),
});
export type MediaDetail = z.infer<typeof mediaDetailSchema>;

/**
 * Ce que le miroir local stocke (docs/PRODUCT.md §4.1), vu du côté AniList.
 *
 * Volontairement **plus étroit** que `mediaSchema` : le cron de rafraîchissement n'a besoin que des
 * colonnes de la table, et une sélection de cinquante fiches paie chaque champ superflu. `MediaDetail`
 * satisfait structurellement cette forme, donc le premier suivi (qui part de la fiche déjà chargée) et
 * le cron peuvent partager la même fonction de recopie.
 */
export const mediaMirrorSchema = z.object({
  id: z.number().int(),
  type: mediaTypeSchema,
  format: mediaFormatSchema.nullable(),
  status: mediaStatusSchema.nullable(),
  countryOfOrigin: z.string().nullable(),
  title: mediaTitleSchema,
  coverImage: mediaCoverImageSchema.nullable(),
  bannerImage: z.string().nullable(),
  episodes: z.number().int().nullable(),
  chapters: z.number().int().nullable(),
  volumes: z.number().int().nullable(),
  season: mediaSeasonSchema.nullable(),
  seasonYear: z.number().int().nullable(),
  genres: z.array(z.string()),
  meanScore: z.number().int().nullable(),
  isAdult: z.boolean(),
});
export type MediaMirror = z.infer<typeof mediaMirrorSchema>;

/**
 * Carte du catalogue éditorialisé : la carte compacte, plus l'année de diffusion.
 *
 * `MediaCard` attend un `MediaCompact` ; l'extension le satisfait donc sans conversion, et la rangée
 * gagne « Série TV · 2024 » en ligne de contexte.
 */
export const mediaBrowseSchema = mediaCompactSchema.extend({
  seasonYear: z.number().int().nullable(),
});
export type MediaBrowse = z.infer<typeof mediaBrowseSchema>;

/**
 * Une diffusion : un épisode d'une œuvre, à une heure.
 *
 * `airingAt` est un horodatage Unix **en secondes** — c'est la convention d'AniList, et c'est aussi
 * l'unité qu'attendent les filtres `airingAt_greater` / `airingAt_lesser`. On ne le convertit qu'à
 * l'affichage (`airing-week.ts`), pour que les bornes envoyées et les valeurs reçues restent
 * comparables sans réfléchir.
 *
 * Aucun champ n'est `nullable()`, contrairement au reste du fichier : une entrée de grille horaire
 * n'existe chez AniList que si ces quatre valeurs existent. Une diffusion sans date n'est pas une
 * diffusion.
 */
export const airingScheduleSchema = z.object({
  id: z.number().int(),
  mediaId: z.number().int(),
  episode: z.number().int(),
  airingAt: z.number().int(),
});
export type AiringSchedule = z.infer<typeof airingScheduleSchema>;

export const pageInfoSchema = z.object({
  total: z.number().int().nullable(),
  currentPage: z.number().int().nullable(),
  lastPage: z.number().int().nullable(),
  hasNextPage: z.boolean().nullable(),
  perPage: z.number().int().nullable(),
});
export type PageInfo = z.infer<typeof pageInfoSchema>;

// --- Forme du `data` par query ---------------------------------------------

export const searchMediaDataSchema = z.object({
  Page: z.object({
    pageInfo: pageInfoSchema,
    media: z.array(mediaSchema),
  }),
});

export const mediaByIdDataSchema = z.object({
  Media: mediaDetailSchema.nullable(),
});

/**
 * Réponse du rafraîchissement par lot. Pas de `pageInfo` : l'appelant sait ce qu'il a demandé, et
 * l'écart entre les ids envoyés et ceux qui reviennent est l'information utile (une œuvre supprimée
 * chez AniList ne revient simplement pas).
 */
export const mediaMirrorDataSchema = z.object({
  Page: z.object({
    media: z.array(mediaMirrorSchema),
  }),
});

/**
 * Les cinq rangées de `/browse`, ramenées par un seul document à alias multiples.
 *
 * Les clés sont les alias du document GraphQL : les renommer ici sans les renommer là-bas fait
 * échouer la validation, ce qui est le bon côté pour se tromper.
 */
export const browseCatalogueDataSchema = z.object({
  trending: z.object({ media: z.array(mediaBrowseSchema) }),
  season: z.object({ media: z.array(mediaBrowseSchema) }),
  upcoming: z.object({ media: z.array(mediaBrowseSchema) }),
  topRated: z.object({ media: z.array(mediaBrowseSchema) }),
  topManga: z.object({ media: z.array(mediaBrowseSchema) }),
});

export const airingScheduleDataSchema = z.object({
  Page: z.object({
    pageInfo: pageInfoSchema,
    airingSchedules: z.array(airingScheduleSchema),
  }),
});

/**
 * Vocabulaires de filtrage. `GenreCollection` peut contenir des `null` — AniList y laisse des
 * trous —, d'où le `nullable()` avant filtrage côté query.
 */
export const filterVocabularyDataSchema = z.object({
  GenreCollection: z.array(z.string().nullable()),
  MediaTagCollection: z.array(
    z.object({
      id: z.number().int(),
      name: z.string(),
      category: z.string().nullable(),
      isGeneralSpoiler: z.boolean().nullable(),
      isAdult: z.boolean().nullable(),
    }),
  ),
});

export type MediaTagOption = z.infer<
  typeof filterVocabularyDataSchema
>["MediaTagCollection"][number];
