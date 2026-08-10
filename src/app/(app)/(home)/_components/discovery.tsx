import { DiscoverySection } from "@/app/(app)/(home)/_components/discovery-section";
import { routes } from "@/config/routes";
import { formatSeason } from "@/features/media/lib/media-format";
import { currentSeason, nextSeason } from "@/features/media/lib/media-season";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import { getBrowseCatalogue } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

/**
 * La part de découverte de l'accueil (docs/PRODUCT.md §5).
 *
 * C'est ce composant qu'on suspend, et il a **sa propre frontière**, distincte du suivi : le suivi
 * se lit dans le miroir local et répond en quelques millisecondes, ces rangées attendent AniList.
 * Les réunir ferait attendre à toute la page ce que seule sa moitié basse demande.
 *
 * Les cinq rangées, en revanche, partagent une seule frontière : elles viennent de la **même**
 * requête — `getBrowseCatalogue` les ramène par un document à alias multiples et le mémorise une
 * heure —, donc elles sont prêtes ensemble, et les éclater ne multiplierait que les sauts de mise
 * en page. Sur les trente requêtes par minute que le serveur partage entre tous les visiteurs,
 * l'accueil en prend une par heure.
 *
 * La saison est calculée **ici**, hors du cache, et passée en argument : la lire à l'intérieur y
 * figerait la saison du premier remplissage, et la page annoncerait encore l'automne en janvier.
 */
export async function Discovery() {
  const { includeAdult } = await getPreferences();

  const season = currentSeason();
  const upcoming = nextSeason(season);

  const catalogue = await getBrowseCatalogue({ ...season, includeAdult });

  /** Vers la recherche, avec les filtres qu'elle sait exprimer. Voir `DiscoverySection.href`. */
  const searchHref = (filters: Parameters<typeof serializeSearchFilters>[1]) =>
    serializeSearchFilters(routes.search, filters);

  return (
    <>
      <DiscoverySection
        description="Ce que le reste du monde regarde en ce moment."
        href={searchHref({ type: "ANIME", sort: "TRENDING", dir: "DESC" })}
        media={catalogue.trending}
        title="Tendances"
      />

      <DiscoverySection
        description={`Les animes de la saison en cours — ${formatSeason(season.season, season.seasonYear)?.toLowerCase()}.`}
        media={catalogue.season}
        title="Cette saison"
      />

      <DiscoverySection
        description={`Ce qui arrive en ${formatSeason(upcoming.season, upcoming.seasonYear)?.toLowerCase()}.`}
        media={catalogue.upcoming}
        title="La saison prochaine"
      />

      <DiscoverySection
        description="Les meilleures notes de la communauté AniList, œuvres non diffusées exclues."
        href={searchHref({ type: "ANIME", sort: "SCORE", dir: "DESC" })}
        media={catalogue.topRated}
        title="Les mieux notés"
      />

      <DiscoverySection
        description="Mangas, webtoons et light novels dont on parle."
        href={searchHref({ type: "MANGA", sort: "TRENDING", dir: "DESC" })}
        media={catalogue.topManga}
        title="Côté papier"
      />
    </>
  );
}
