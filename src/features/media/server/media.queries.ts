import "server-only";

import { cacheLife } from "next/cache";

import {
  type MediaDetail,
  mediaByIdDataSchema,
} from "@/features/media/schemas/media.schema";
import { MEDIA_BY_ID_QUERY } from "@/features/media/server/media.documents";
import { anilistQuery, isAniListError } from "@/lib/http/anilist";

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
