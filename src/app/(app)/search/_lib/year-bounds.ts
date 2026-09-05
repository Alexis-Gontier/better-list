import "server-only";

import { cacheLife } from "next/cache";
import { currentSeason } from "@/features/media/lib/media-season";
import { MIN_MEDIA_YEAR } from "@/features/media/schemas/search-media.schema";

export type YearBounds = { min: number; max: number };

/**
 * Les bornes du curseur d'années, **cachées pour que la page reste prérendable**.
 *
 * Le plafond dépend de l'horloge, et `cacheComponents` refuse un `new Date()` pendant le prérendu :
 * une valeur qui change entre deux rendus doit être cachée, ou lue à la requête. Rendre la page
 * dynamique pour deux entiers reviendrait à perdre la coquille statique de tout l'écran.
 *
 * `cacheLife("days")` est le bon ordre de grandeur : le plafond ne bouge qu'une fois l'an. Ce qu'il
 * ne faut pas faire, c'est le figer en constante de module — il annoncerait encore 2026 en 2028.
 *
 * **Le plafond n'est pas `MAX_MEDIA_YEAR`.** Le schéma accepte jusqu'à 2100 pour ne jamais rejeter
 * une adresse, mais un curseur qui court jusqu'en 2100 consacre les trois quarts de sa course à des
 * années où rien n'est jamais sorti. On s'arrête donc à la saison à venir — la même que celle
 * qu'AniList annonce déjà —, ce qui met la poignée droite en butée sur « aujourd'hui ».
 */
export async function getYearBounds(): Promise<YearBounds> {
  "use cache";
  cacheLife("days");

  return { min: MIN_MEDIA_YEAR, max: currentSeason().seasonYear };
}
