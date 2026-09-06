import "server-only";

import { cacheLife } from "next/cache";

import {
  type Media,
  type MediaDetail,
  mediaByIdDataSchema,
  searchMediaDataSchema,
} from "@/features/media/schemas/media.schema";
import {
  type SearchMediaParams,
  toAniListSort,
} from "@/features/media/schemas/search-media.schema";
import {
  MEDIA_BY_ID_QUERY,
  SEARCH_MEDIA_QUERY,
} from "@/features/media/server/media.documents";
import { anilistQuery, isAniListError, tryAniList } from "@/lib/http/anilist";

/**
 * Lectures AniList mises en cache.
 *
 * Le cache n'est pas un confort : AniList plafonne à 30 requêtes/minute **par IP**, et en
 * production cette IP est partagée par tous les visiteurs (docs/PRODUCT.md §4.1). Chaque lecture
 * non mémorisée est prélevée sur ce même compteur.
 */

/**
 * La fiche brute, telle qu'AniList la rend — **sans le filtre 18+**.
 *
 * La séparation avec `getMediaById` n'est pas cosmétique : les arguments d'une fonction `"use
 * cache"` font partie de sa clé. Mettre `includeAdult` ici donnerait deux entrées pour la même
 * œuvre, donc **deux requêtes AniList** là où le document GraphQL envoyé est identique — un
 * crédit de quota dépensé pour une préférence qui ne change rien à la question posée.
 *
 * `cacheLife("days")` : une fiche bouge à la marge (un synopsis corrigé, une recommandation de
 * plus). Ce qui bouge vraiment — le nombre d'épisodes d'une série en cours — est servi par le
 * miroir local, pas par cette lecture.
 */
async function fetchMediaById(id: number): Promise<MediaDetail | null> {
  "use cache";
  cacheLife("days");

  try {
    const { Media } = await anilistQuery({
      query: MEDIA_BY_ID_QUERY,
      variables: { id },
      schema: mediaByIdDataSchema,
    });

    return Media;
  } catch (error) {
    /**
     * Le 404 est rattrapé **ici, dans le cache**, contrairement à la règle générale — et pour la
     * raison exacte qui fonde cette règle. On ne mémorise une absence que lorsqu'elle est
     * définitive : un id AniList qui n'existe pas ne se met pas à exister. Une panne, elle, se
     * répare, donc son erreur continue de traverser sans être rattrapée : l'entrée n'est pas
     * écrite et la visite suivante retente (docs/ARCHITECTURE.md, `tryAniList`).
     *
     * `instanceof` est fiable à cet endroit précis : on est **avant** la frontière du cache, celle
     * qui resérialise l'erreur en `Error` nu. En aval, seul le `name` survit.
     */
    if (isAniListError(error) && error.isNotFound) return null;
    throw error;
  }
}

/**
 * La fiche d'une œuvre, filtrée selon la préférence de contenu adulte du compte.
 *
 * Renvoie `null` dans deux cas volontairement confondus : l'œuvre n'existe pas, ou elle est
 * classée adulte alors que la préférence est éteinte. Pour l'appelant, la page n'existe pas — et
 * répondre différemment reviendrait à confirmer l'existence de ce qu'on refuse de montrer.
 *
 * **Le filtre est appliqué hors du cache**, sur des données déjà en mémoire : c'est ce qui permet
 * aux quatre comptes de partager une seule entrée par œuvre.
 */
export async function getMediaById(
  id: number,
  { includeAdult }: { includeAdult: boolean },
): Promise<MediaDetail | null> {
  const media = await fetchMediaById(id);

  if (!media) return null;
  if (media.isAdult && !includeAdult) return null;

  return media;
}

/** Ce qu'une recherche rend : la page demandée, et de quoi la situer dans l'ensemble. */
export type SearchMediaResult = {
  items: Media[];
  /** Le nombre de résultats annoncé par AniList — **plafonné**, voir `ANILIST_TOTAL_CAP`. */
  total: number;
  /** `true` quand `total` a touché le plafond, donc quand il ne veut plus dire « combien ». */
  totalIsCapped: boolean;
  /** La page réellement servie, et le nombre de pages qu'on peut honnêtement annoncer. */
  page: number;
  pageCount: number;
};

/**
 * **AniList plafonne `pageInfo.total` à 5000**, quelle que soit la requête.
 *
 * Vérifié le 6 septembre 2026, en interrogeant l'endpoint : `type: ANIME` seul, puis avec la
 * saison, puis avec la plage d'années, puis avec la note minimale — les quatre répondent
 * exactement `5000`. Ce n'est donc pas un compte, c'est une butée, et `lastPage` en hérite : il
 * annonçait 238 pages là où la recherche en avait une douzaine, dont 226 vides.
 *
 * Les filtres, eux, s'appliquent bien — c'est le compteur seul qui ment. D'où le traitement séparé
 * ci-dessous : sous le plafond, `lastPage` est exact et on l'affiche ; au plafond, on ne sait plus
 * rien de la fin et on n'annonce que ce dont `hasNextPage` témoigne.
 */
const ANILIST_TOTAL_CAP = 5000;

/**
 * Le plafond de pagination qu'on s'impose en plus.
 *
 * Le schéma d'entrée borne déjà `page` à 1000 ; on s'arrête au même endroit, pour que le contrôle
 * et la requête disent la même chose. Personne ne va page 800 d'une recherche.
 */
const MAX_SEARCH_PAGES = 1000;

/**
 * Une année pleine → le `FuzzyDateInt` qu'attend AniList.
 *
 * Huit chiffres `AAAAMMJJ`, **les parties inconnues à zéro** : 2016 s'écrit `20160000`. La borne
 * haute prend le 31 décembre plutôt que `0000`, sans quoi `startDate_lesser` exclurait l'année
 * qu'on vient de désigner — `20261231` inclut tout 2026, `20260000` n'inclut rien de 2026.
 */
function toFuzzyDate(year: number, edge: "start" | "end"): number {
  return edge === "start" ? year * 10_000 : year * 10_000 + 1231;
}

/**
 * La recherche du catalogue, **mise en cache et facturée au quota**.
 *
 * Chaque combinaison distincte de facettes est une entrée de cache **et** une requête sur les
 * trente que la minute partage entre tous les visiteurs (docs/recherche-filtres.md). C'est pour ça
 * que les curseurs avancent par paliers et que le tri est clos : le prix d'un filtre se paie ici.
 *
 * **`includeAdult` fait partie de la clé, contrairement à la fiche** — et l'écart est justifié.
 * `getMediaById` filtre après coup, sur un document identique, donc mettre la préférence dans sa
 * clé aurait doublé les requêtes pour rien. Ici la préférence part **dans** la requête (`isAdult`),
 * donc les deux comptes reçoivent des résultats différents : partager une entrée reviendrait à
 * servir l'un avec les résultats de l'autre.
 *
 * `cacheLife("hours")` et non `"days"` : un classement par tendance qui aurait un jour de retard
 * n'est plus un classement par tendance.
 */
async function fetchSearchMedia(
  params: SearchMediaParams,
): Promise<SearchMediaResult> {
  "use cache";
  cacheLife("hours");

  const { Page } = await anilistQuery({
    query: SEARCH_MEDIA_QUERY,
    variables: {
      search: params.search,
      type: params.type,
      formats: params.formats,
      countryOfOrigin: params.countryOfOrigin,
      status: params.status,
      genres: params.genres,
      tags: params.tags,
      season: params.season,
      seasonYear: params.seasonYear,
      startDateGreater:
        params.yearMin === undefined
          ? undefined
          : toFuzzyDate(params.yearMin, "start"),
      startDateLesser:
        params.yearMax === undefined
          ? undefined
          : toFuzzyDate(params.yearMax, "end"),
      averageScoreGreater: params.minimumScore,
      page: params.page,
      perPage: params.perPage,
      sort: toAniListSort(params.sortField, params.sortDirection),
      isAdult: params.includeAdult ? undefined : false,
    },
    schema: searchMediaDataSchema,
  });

  /*
    Tous les champs de `pageInfo` sont nullables chez AniList, et les replis ne sont pas
    interchangeables. Un `total` inconnu vaut « ce qu'on a sous les yeux » ; un `lastPage` inconnu
    vaut « la page courante », c'est-à-dire pas de cran suivant — mieux vaut une pagination qui
    s'arrête trop tôt qu'une qui propose une page vide.
  */
  const page = Page.pageInfo.currentPage ?? params.page;
  const total = Page.pageInfo.total ?? Page.media.length;
  const totalIsCapped = total >= ANILIST_TOTAL_CAP;
  const hasNext = Page.pageInfo.hasNextPage ?? false;

  return {
    items: Page.media,
    total,
    totalIsCapped,
    page,
    /*
      Au plafond, `lastPage` n'est plus une information : il vaut `5000 / perPage` pour toutes les
      requêtes du monde. On n'annonce alors qu'un cran de plus que la page courante, et seulement si
      `hasNextPage` le confirme — c'est la seule chose qu'AniList dise encore de vrai sur la suite.
      Le visiteur avance page par page au lieu de sauter à une page 238 vide.
    */
    pageCount: totalIsCapped
      ? hasNext
        ? page + 1
        : page
      : Math.min(Page.pageInfo.lastPage ?? page, MAX_SEARCH_PAGES),
  };
}

/**
 * La recherche, **avec la panne rattrapée hors du cache**.
 *
 * La règle est celle de CLAUDE.md et elle a une raison précise : mémoriser un échec, c'est servir
 * la panne pendant toute la durée de vie de l'entrée, alors même que le service est revenu. Le
 * `"use cache"` ne voit donc passer que des succès, et `tryAniList` renvoie `null` à l'appelant —
 * à charge pour l'écran de se replier sur le miroir local et de dire ce qu'il y perd.
 */
export async function searchMedia(
  params: SearchMediaParams,
): Promise<SearchMediaResult | null> {
  return tryAniList(() => fetchSearchMedia(params));
}
