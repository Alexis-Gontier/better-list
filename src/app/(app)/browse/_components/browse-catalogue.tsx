import { BrowseSection } from "@/app/(app)/browse/_components/browse-section";
import { routes } from "@/config/routes";
import { formatSeason } from "@/features/media/lib/media-format";
import { currentSeason, nextSeason } from "@/features/media/lib/media-season";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import { getBrowseCatalogue } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * Le catalogue éditorialisé (docs/PRODUCT.md §5, V1).
 *
 * C'est ce composant qu'on suspend : il attend une préférence de compte **et** la réponse d'AniList. La
 * page, elle, n'attend rien et part immédiatement — même découpage que `/search`.
 *
 * Les cinq rangées ne coûtent qu'une requête AniList : `getBrowseCatalogue` les ramène par un document
 * à alias multiples, et la mémorise une heure. Sur les trente requêtes par minute que le serveur
 * partage entre tous les visiteurs, cette page en prend une par heure — pas une par rangée et par
 * visite.
 *
 * La saison est calculée **ici**, hors du cache, et passée en argument : la lire à l'intérieur y
 * figerait la saison du premier remplissage, et la page annoncerait encore l'automne au mois de
 * janvier.
 */
export async function BrowseCatalogue() {
  const { includeAdult } = await getPreferences();

  const season = currentSeason();
  const upcoming = nextSeason(season);

  const catalogue = await getBrowseCatalogue({ ...season, includeAdult });

  /** Vers la recherche, avec les filtres qu'elle sait exprimer. Voir `BrowseSection.href`. */
  const searchHref = (filters: Parameters<typeof serializeSearchFilters>[1]) =>
    serializeSearchFilters(routes.search, filters);

  return (
    <div className="space-y-10">
      <BrowseSection
        description="Ce que le reste du monde regarde en ce moment."
        href={searchHref({ type: "ANIME", sort: "TRENDING", dir: "DESC" })}
        media={catalogue.trending}
        title="Tendances"
      />

      <BrowseSection
        description={`Les animes de la saison en cours — ${formatSeason(season.season, season.seasonYear)?.toLowerCase()}.`}
        media={catalogue.season}
        title="Cette saison"
      />

      <BrowseSection
        description={`Ce qui arrive en ${formatSeason(upcoming.season, upcoming.seasonYear)?.toLowerCase()}.`}
        media={catalogue.upcoming}
        title="La saison prochaine"
      />

      <BrowseSection
        description="Les meilleures notes de la communauté AniList, œuvres non diffusées exclues."
        href={searchHref({ type: "ANIME", sort: "SCORE", dir: "DESC" })}
        media={catalogue.topRated}
        title="Les mieux notés"
      />

      <BrowseSection
        description="Mangas, webtoons et light novels dont on parle."
        href={searchHref({ type: "MANGA", sort: "TRENDING", dir: "DESC" })}
        media={catalogue.topManga}
        title="Côté papier"
      />
    </div>
  );
}
