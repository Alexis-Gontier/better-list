/**
 * Documents GraphQL AniList.
 *
 * Gardés en chaînes simples, sans codegen : les schémas Zod de `schemas/media.schema.ts` sont la
 * source de vérité des formes de réponse, et ces sélections doivent leur correspondre. Ajouter
 * un champ ici sans l'ajouter au schéma le fait simplement disparaître au parsing — l'inverse
 * casse la validation, donc l'erreur est bruyante du bon côté.
 */

/** Champs sélectionnés pour tout Media de liste. Calqué sur `mediaSchema`. */
const MEDIA_FIELDS = /* GraphQL */ `
  fragment MediaFields on Media {
    id
    type
    format
    status
    description(asHtml: false)
    season
    seasonYear
    episodes
    chapters
    volumes
    countryOfOrigin
    isAdult
    averageScore
    meanScore
    genres
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    title {
      romaji
      english
      native
      userPreferred
    }
    siteUrl
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
  }
`;

/** Sélection allégée, réutilisée dans les relations et recommandations. */
const MEDIA_COMPACT_FIELDS = /* GraphQL */ `
  fragment MediaCompactFields on Media {
    id
    type
    format
    status
    averageScore
    isAdult
    title {
      romaji
      english
      native
      userPreferred
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
  }
`;

/**
 * Sélection du **miroir local** — exactement les colonnes de la table `Media` (docs/PRODUCT.md §4.1),
 * ni plus ni moins.
 *
 * Ce n'est pas `MediaFields` : celui-là embarque `description`, `siteUrl` et les dates floues, qui ne
 * sont pas mirroités et qu'on paierait sur cinquante fiches à chaque passe du cron. Une sélection
 * dédiée est le prix à payer pour que le rafraîchissement reste bon marché.
 */
const MEDIA_MIRROR_FIELDS = /* GraphQL */ `
  fragment MediaMirrorFields on Media {
    id
    type
    format
    status
    countryOfOrigin
    title {
      romaji
      english
      native
      userPreferred
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    episodes
    chapters
    volumes
    season
    seasonYear
    genres
    meanScore
    isAdult
  }
`;

/**
 * Sélection du catalogue éditorialisé (`/browse`) : la carte compacte, plus l'année.
 *
 * `MediaCompactFields` ne porte pas `seasonYear`, or c'est l'information qui distingue deux entrées
 * d'une même franchise dans une rangée « les mieux notés ». Un champ de plus sur douze cartes, contre
 * la sélection complète de `MediaFields` qui en ramènerait quinze inutiles.
 */
const MEDIA_BROWSE_FIELDS = /* GraphQL */ `
  fragment MediaBrowseFields on Media {
    id
    type
    format
    status
    averageScore
    isAdult
    seasonYear
    title {
      romaji
      english
      native
      userPreferred
    }
    coverImage {
      extraLarge
      large
      medium
      color
    }
  }
`;

/**
 * Rafraîchissement du miroir, **par lots de cinquante**.
 *
 * `id_in` est ce qui rend le cron tenable : cinquante fiches pour une requête, donc un miroir de
 * mille titres remis à jour en vingt requêtes, là où une boucle par œuvre épuiserait le quota de 30
 * requêtes/minute au trente-et-unième titre.
 *
 * Pas de `pageInfo` : l'appelant connaît déjà les ids qu'il a demandés, et ce qui ne revient pas est
 * précisément l'information utile — l'œuvre a disparu d'AniList (voir `refreshStaleMirror`).
 */
export const MEDIA_MIRROR_QUERY = /* GraphQL */ `
  query MediaMirror($ids: [Int], $perPage: Int = 50) {
    Page(page: 1, perPage: $perPage) {
      media(id_in: $ids) {
        ...MediaMirrorFields
      }
    }
  }
  ${MEDIA_MIRROR_FIELDS}
`;

/**
 * Le catalogue éditorialisé de `/browse` : cinq rangées, **une seule requête AniList**.
 *
 * GraphQL autorise plusieurs champs `Page` dans le même document dès qu'ils portent des alias, et
 * c'est exactement ce que le quota commande : cinq requêtes séparées coûteraient cinq crédits sur les
 * trente de la minute, partagés par tous les visiteurs. Une seule en coûte un.
 *
 * `status_not: NOT_YET_RELEASED` sur les mieux notés n'est pas cosmétique : une œuvre non diffusée
 * porte parfois une moyenne calculée sur trois votes, qui la placerait en tête d'un classement censé
 * dire quelque chose.
 */
export const BROWSE_CATALOGUE_QUERY = /* GraphQL */ `
  query BrowseCatalogue(
    $season: MediaSeason
    $seasonYear: Int
    $nextSeason: MediaSeason
    $nextSeasonYear: Int
    $perPage: Int = 12
    $isAdult: Boolean
  ) {
    trending: Page(page: 1, perPage: $perPage) {
      media(type: ANIME, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ...MediaBrowseFields
      }
    }
    season: Page(page: 1, perPage: $perPage) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        sort: [POPULARITY_DESC]
        isAdult: $isAdult
      ) {
        ...MediaBrowseFields
      }
    }
    upcoming: Page(page: 1, perPage: $perPage) {
      media(
        type: ANIME
        season: $nextSeason
        seasonYear: $nextSeasonYear
        sort: [POPULARITY_DESC]
        isAdult: $isAdult
      ) {
        ...MediaBrowseFields
      }
    }
    topRated: Page(page: 1, perPage: $perPage) {
      media(
        type: ANIME
        sort: [SCORE_DESC]
        status_not: NOT_YET_RELEASED
        isAdult: $isAdult
      ) {
        ...MediaBrowseFields
      }
    }
    topManga: Page(page: 1, perPage: $perPage) {
      media(type: MANGA, sort: [TRENDING_DESC], isAdult: $isAdult) {
        ...MediaBrowseFields
      }
    }
  }
  ${MEDIA_BROWSE_FIELDS}
`;

export const SEARCH_MEDIA_QUERY = /* GraphQL */ `
  query SearchMedia(
    $search: String
    $type: MediaType
    $format: MediaFormat
    $countryOfOrigin: CountryCode
    $status: MediaStatus
    $genres: [String]
    $tags: [String]
    $seasonYear: Int
    $page: Int = 1
    $perPage: Int = 20
    $sort: [MediaSort]
    $isAdult: Boolean
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
        perPage
      }
      media(
        search: $search
        type: $type
        format: $format
        countryOfOrigin: $countryOfOrigin
        status: $status
        genre_in: $genres
        tag_in: $tags
        seasonYear: $seasonYear
        sort: $sort
        isAdult: $isAdult
      ) {
        ...MediaFields
      }
    }
  }
  ${MEDIA_FIELDS}
`;

/**
 * Vocabulaires de filtrage : la liste des genres et celle des tags.
 *
 * Deux collections quasi statiques, servies en une seule requête. Elles n'ont aucune raison d'être
 * rechargées souvent — d'où un `cacheLife` long côté query.
 */
export const FILTER_VOCABULARY_QUERY = /* GraphQL */ `
  query FilterVocabulary {
    GenreCollection
    MediaTagCollection {
      id
      name
      category
      isGeneralSpoiler
      isAdult
    }
  }
`;

/**
 * Sélection riche de la fiche. Personnages, staff et recommandations sont bornés côté requête
 * pour garder la charge utile — et le coût en quota AniList — raisonnable.
 */
export const MEDIA_BY_ID_QUERY = /* GraphQL */ `
  query MediaById($id: Int) {
    Media(id: $id) {
      ...MediaFields
      idMal
      duration
      source
      popularity
      favourites
      # Titres officieux et traductions. Uniquement sur la fiche : tableau de longueur
      # arbitraire, sans valeur sur une carte de liste.
      synonyms
      trailer {
        id
        site
        thumbnail
      }
      # Distributions communautaires. scoreDistribution est toujours sur 100 chez AniList, quel
      # que soit le format d'affichage du compte qui interroge — donc comparable d'une fiche à
      # l'autre sans conversion.
      stats {
        scoreDistribution {
          score
          amount
        }
        statusDistribution {
          status
          amount
        }
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
      rankings {
        rank
        type
        format
        year
        season
        allTime
        context
      }
      tags {
        id
        name
        rank
        isMediaSpoiler
        isGeneralSpoiler
        isAdult
      }
      externalLinks {
        id
        site
        url
        type
        color
        icon
      }
      studios {
        edges {
          isMain
          node {
            id
            name
          }
        }
      }
      characters(sort: [ROLE, RELEVANCE], perPage: 12) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id
            name {
              full
            }
            image {
              large
            }
            languageV2
          }
        }
      }
      staff(sort: [RELEVANCE], perPage: 8) {
        edges {
          role
          node {
            id
            name {
              full
            }
            image {
              large
            }
          }
        }
      }
      relations {
        edges {
          relationType
          node {
            ...MediaCompactFields
          }
        }
      }
      recommendations(sort: [RATING_DESC], perPage: 12) {
        nodes {
          rating
          mediaRecommendation {
            ...MediaCompactFields
          }
        }
      }
    }
  }
  ${MEDIA_FIELDS}
  ${MEDIA_COMPACT_FIELDS}
`;
