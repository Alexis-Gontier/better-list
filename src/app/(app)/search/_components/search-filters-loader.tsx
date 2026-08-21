import { SearchFilters } from "@/app/(app)/search/_components/search-filters";
import { currentSeason } from "@/features/media/lib/media-season";
import { seasonSlotOptions } from "@/features/media/lib/search-params";
import { getFilterVocabulary } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { tryAniList } from "@/lib/http/anilist";

/**
 * Charge le vocabulaire de filtrage côté serveur, puis passe la main à l'îlot client.
 *
 * Les cinq cents tags d'AniList n'ont rien à faire dans un bundle client, et leur liste ne change
 * pas d'un jour à l'autre : la lecture est cachée en `days` dans la query. Cette séparation est la
 * raison d'être du fichier — `SearchFilters` reste purement interactif, sans accès réseau.
 */
export async function SearchFiltersLoader() {
  const { includeAdult } = await getPreferences();

  /**
   * Le vocabulaire vient d'AniList, la barre de filtres non.
   *
   * Pendant une coupure, on rend la barre **avec des listes vides** plutôt que de la retirer : le
   * terme de recherche, le type, le statut et le tri ne dépendent d'aucun appel réseau, et ce sont
   * eux qu'on manipule le plus souvent. Retirer la barre entière ferait aussi disparaître les puces
   * de filtres actifs, donc le seul moyen de *défaire* un filtre — l'utilisateur se retrouverait
   * coincé sur une recherche qu'il ne peut plus modifier.
   *
   * Le repli se fait ici, hors du `"use cache"` de la query, pour que le retour d'AniList soit
   * immédiat et non retardé du `cacheLife` (voir `tryAniList`).
   */
  const vocabulary = await tryAniList(() =>
    getFilterVocabulary({ includeAdult }),
  );
  const { genres, tags } = vocabulary ?? { genres: [], tags: [] };

  return (
    <SearchFilters
      genres={genres}
      /**
       * Les trimestres sont calculés **ici**, pas dans l'îlot client : `currentSeason()` lit
       * l'horloge, et deux horloges — celle du serveur, celle du visiteur — ne tombent pas
       * forcément du même côté d'un changement de saison. Le calcul fait au rendu et transmis en
       * propriété ne peut pas produire de désaccord d'hydratation.
       */
      seasons={seasonSlotOptions(currentSeason())}
      /**
       * On filtre les tags qui divulgâchent : ils décrivent des retournements d'intrigue, et les
       * proposer dans une liste de filtres revient à les révéler à qui la parcourt.
       */
      tags={tags.filter((tag) => !tag.isGeneralSpoiler).map((tag) => tag.name)}
    />
  );
}
