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
 *
 * Et **autour** aussi : une œuvre que personne n'a encore notée ni suivie rend les deux tableaux à
 * `null` (relevé le 26 septembre 2026 sur 217330 et 217331, deux saisons annoncées). `.default()`
 * ne couvre que l'absence, jamais `null` — d'où le `transform`, qui garde le type en tableau pour
 * les lecteurs.
 */
export const mediaStatsSchema = z.object({
  scoreDistribution: z
    .array(scoreDistributionSchema.nullable())
    .nullish()
    .transform((distribution) => distribution ?? []),
  statusDistribution: z
    .array(statusDistributionSchema.nullable())
    .nullish()
    .transform((distribution) => distribution ?? []),
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

/** Un champ qu'AniList peut omettre **ou** renvoyer à `null` : les deux deviennent `null`. */
function optional<T extends z.ZodType>(schema: T) {
  return schema.nullish().transform((value) => value ?? null);
}

/**
 * Une personne attachée à une œuvre — personnage, doubleur ou membre de l'équipe —, **avec ce que
 * dit son survol** : nom natif, biographie, favoris, genre, âge, anniversaire.
 *
 * Tous facultatifs, pour deux raisons : AniList en laisse la moitié vides sur un second rôle, et
 * une fiche mise en cache avant l'ajout de ces champs doit encore se lire.
 */
export const personPreviewSchema = z.object({
  id: z.number().int(),
  name: nameSchema.extend({ native: optional(z.string()) }),
  image: personImageSchema,
  description: optional(z.string()),
  favourites: optional(z.number().int()),
  gender: optional(z.string()),
  /** Un nombre chez un staff, du texte libre chez un personnage (« 17- »). */
  age: optional(z.union([z.string(), z.number()])),
  dateOfBirth: optional(fuzzyDateSchema),
});
export type PersonPreviewData = z.infer<typeof personPreviewSchema>;

export const characterEdgeSchema = z.object({
  role: z.string().nullable(),
  node: personPreviewSchema,
  voiceActors: z
    .array(personPreviewSchema.extend({ languageV2: z.string().nullable() }))
    .default([]),
});

export const staffEdgeSchema = z.object({
  role: z.string().nullable(),
  node: personPreviewSchema.extend({
    primaryOccupations: optional(z.array(z.string().nullable())),
  }),
});

/**
 * Media allégé — **ce qu'une vignette de catalogue sait d'une œuvre**, partout dans le produit.
 *
 * C'est la forme qu'attend `MediaCard`, donc celle de la recherche, de la bibliothèque, de
 * l'accueil, des listes, des relations et des recommandations.
 *
 * **Élargi le 14 septembre 2026** de cinq champs — `episodes`, `chapters`, `season`, `seasonYear`,
 * `genres` — pour le panneau de survol de la carte. Le choix est d'élargir **cette** forme plutôt
 * que de câbler sept appelants : le panneau doit dire la même chose sur les sept écrans, et une
 * carte riche par construction est ce qui l'assure sans qu'aucun appelant ait à y penser. C'est
 * aussi ce qui a fait disparaître les redéclarations de `mediaBrowseSchema` et
 * `airingMediaSchema`, qui reprenaient déjà une partie de ces champs chacun dans son coin.
 *
 * **Élargi de nouveau le 17 septembre 2026** de `countryOfOrigin` et `description`, quand le panneau
 * a demandé un synopsis. La question posée était « et si on faisait une requête au survol ? » : la
 * réponse est non, et c'est le quota qui tranche — trente requêtes par minute partagées entre tous
 * les visiteurs, contre sept dépensées à survoler une seule rangée. Élargir la réponse qu'on
 * demande déjà donne la même information pour zéro requête.
 *
 * **Ce que ça coûte** : sept champs de plus sur les ~50 nœuds de relations et recommandations de la
 * fiche, et sur les 48 cartes de l'accueil — dont un synopsis, qui est le seul vraiment lourd. De la
 * taille de réponse, **aucune requête de plus** : le quota AniList, seule ressource comptée ici, ne
 * bouge pas.
 *
 * **Le miroir local n'a ni l'un ni l'autre en colonne** pour le synopsis (§4.1 n'a retenu que de
 * quoi « afficher une carte et trier »), donc une recherche servie par le repli rend `null` : le
 * panneau s'y referme sur ce qu'il a, comme il le fait déjà pour une œuvre annoncée sans note.
 */
export const mediaCompactSchema = z.object({
  id: z.number().int(),
  type: mediaTypeSchema,
  format: mediaFormatSchema.nullable(),
  status: mediaStatusSchema.nullable(),
  averageScore: z.number().int().nullable(),
  isAdult: z.boolean(),
  title: mediaTitleSchema,
  coverImage: mediaCoverImageSchema.nullable(),
  episodes: z.number().int().nullable(),
  chapters: z.number().int().nullable(),
  season: mediaSeasonSchema.nullable(),
  seasonYear: z.number().int().nullable(),
  genres: z.array(z.string()),
  countryOfOrigin: z.string().nullable(),
  description: z.string().nullable(),
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
 * Carte du catalogue éditorialisé : la carte compacte, **plus la bannière**.
 *
 * `MediaCard` attend un `MediaCompact` ; l'extension le satisfait donc sans conversion.
 *
 * Elle redéclarait `seasonYear` et `genres` jusqu'au 14 septembre 2026 ; `mediaCompactSchema` les
 * porte désormais pour tout le monde, et l'extension se réduit au seul champ qui lui est propre.
 *
 * `bannerImage` n'est lu que par le hero de l'accueil, qui se rabat sur les tendances quand la
 * bibliothèque est vide. Elle est `null` sur la plupart des mangas et des webtoons chez AniList —
 * l'appelant doit toujours prévoir le cas.
 */
export const mediaBrowseSchema = mediaCompactSchema.extend({
  bannerImage: z.string().nullable(),
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
/**
 * L'œuvre telle qu'une case de planning en a besoin.
 *
 * **Un `pick` de `mediaCompactSchema`, et plus une extension** depuis le 14 septembre 2026. La
 * carte compacte s'est élargie de cinq champs pour le panneau de survol ; le planning, lui, n'a pas
 * de `MediaCard` — il a sa propre case — et n'a donc aucune raison de payer des genres et une
 * saison sur les 124 diffusions d'une semaine. Le `pick` garde la parenté (renommer un champ de la
 * carte compacte casse ici, ce qui est le bon côté pour se tromper) sans hériter de l'élargissement.
 *
 * `episodes` est retenu parce que la case écrit « vu 10 / 12 » ; le reste est ce qu'une vignette
 * demande, ni plus ni moins.
 */
export const airingMediaSchema = mediaCompactSchema.pick({
  id: true,
  type: true,
  format: true,
  status: true,
  averageScore: true,
  isAdult: true,
  title: true,
  coverImage: true,
  episodes: true,
});
export type AiringMedia = z.infer<typeof airingMediaSchema>;

export const airingScheduleSchema = z.object({
  id: z.number().int(),
  mediaId: z.number().int(),
  episode: z.number().int(),
  airingAt: z.number().int(),
  /**
   * L'œuvre diffusée, **jointe par AniList depuis le 8 septembre 2026**.
   *
   * `nullable()` comme presque tout chez AniList : une grille horaire dont l'œuvre a été supprimée
   * entre-temps rend `null` plutôt que de disparaître. Une diffusion sans œuvre n'est pas affichable
   * — l'écran la laisse tomber plutôt que de rendre une case anonyme.
   */
  media: airingMediaSchema.nullable(),
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
 * Réponses des lectures **par onglet** de la fiche.
 *
 * Les trois portent `isAdult` pour une raison unique et non cosmétique : la préférence de contenu
 * du compte s'applique **hors du cache**, sur des données déjà en mémoire (docs/PRODUCT.md §4.1).
 * Sans ce champ, l'onglet d'une œuvre classée adulte s'afficherait alors que sa fiche est refusée —
 * chaque lecture doit donc pouvoir répondre à la question toute seule, sans dépendre d'une autre.
 *
 * `id` est demandé pour la même raison qu'ailleurs : c'est la seule preuve que la réponse concerne
 * bien l'œuvre demandée.
 */
const tabMediaSchema = z.object({
  id: z.number().int(),
  isAdult: z.boolean(),
});

export const mediaCharactersDataSchema = z.object({
  Media: tabMediaSchema
    .extend({
      characters: z
        .object({ edges: z.array(characterEdgeSchema).default([]) })
        .default({ edges: [] }),
    })
    .nullable(),
});

export const mediaStaffDataSchema = z.object({
  Media: tabMediaSchema
    .extend({
      staff: z
        .object({ edges: z.array(staffEdgeSchema).default([]) })
        .default({ edges: [] }),
    })
    .nullable(),
});

export const mediaRecommendationsDataSchema = z.object({
  Media: tabMediaSchema
    .extend({
      recommendations: z
        .object({ nodes: z.array(recommendationNodeSchema).default([]) })
        .default({ nodes: [] }),
    })
    .nullable(),
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
 * Les quatre rangées de l'accueil, ramenées par un seul document à alias multiples.
 *
 * Les clés sont les alias du document GraphQL : les renommer ici sans les renommer là-bas fait
 * échouer la validation, ce qui est le bon côté pour se tromper.
 */
export const browseCatalogueDataSchema = z.object({
  trending: z.object({ media: z.array(mediaBrowseSchema) }),
  season: z.object({ media: z.array(mediaBrowseSchema) }),
  upcoming: z.object({ media: z.array(mediaBrowseSchema) }),
  topRated: z.object({ media: z.array(mediaBrowseSchema) }),
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
