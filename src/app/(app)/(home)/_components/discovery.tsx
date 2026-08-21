import { DiscoverySection } from "@/app/(app)/(home)/_components/discovery-section";
import { routes } from "@/config/routes";
import { formatSeason } from "@/features/media/lib/media-format";
import {
  currentSeason,
  nextSeason,
  type SeasonSlot,
} from "@/features/media/lib/media-season";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import { getBrowseCatalogue } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";
import { getEntryStatesFor } from "@/features/tracking/server/tracking.queries";
import { tryAniList } from "@/lib/http/anilist";

/**
 * La part de découverte de l'accueil (docs/PRODUCT.md §5).
 *
 * C'est ce composant qu'on suspend, et il a **sa propre frontière**, distincte du suivi : le suivi
 * se lit dans le miroir local et répond en quelques millisecondes, ces rangées attendent AniList.
 * Les réunir ferait attendre à toute la page ce que seule sa moitié basse demande.
 *
 * Les quatre rangées, en revanche, partagent une seule frontière : elles viennent de la **même**
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

  /**
   * AniList coupé : les rangées disparaissent, sans un mot. C'est le bandeau en tête de page
   * (`CatalogueUnavailableBanner`) qui l'annonce, une fois pour les trois blocs concernés — dire ici
   * la même chose ferait un second message à cinq écrans du premier.
   *
   * `tryAniList` est appelé ici et non dans `getBrowseCatalogue` : la fonction cachée doit continuer
   * à lever, sinon le `null` d'une coupure de trente secondes serait mémorisé une heure. Le prix est
   * une requête retentée à chaque visite pendant la panne — c'est le comportement qu'on veut.
   */
  const catalogue = await tryAniList(() =>
    getBrowseCatalogue({ ...season, includeAdult }),
  );

  if (!catalogue) return null;

  /**
   * Ce que ce compte suit déjà, sur les cinq rangées d'un coup.
   *
   * Lu **ici** et non dans chaque rangée : cinq sections feraient cinq requêtes pour une question
   * qui tient en une, et une œuvre peut d'ailleurs apparaître dans deux rangées à la fois — la
   * dédupliquer avant d'interroger la base est gratuit, la croiser cinq fois ne l'est pas.
   *
   * Cette lecture dépend du compte, là où `getBrowseCatalogue` est mémorisé une heure pour tout le
   * monde : les garder distinctes est ce qui permet au catalogue de rester partagé.
   */
  const entries = await getEntryStatesFor([
    ...new Set(
      [
        catalogue.trending,
        catalogue.season,
        catalogue.upcoming,
        catalogue.topRated,
      ].flatMap((row) => row.map((item) => item.id)),
    ),
  ]);

  /** Vers la recherche, avec les filtres qu'elle sait exprimer. Voir `DiscoverySection.href`. */
  const searchHref = (filters: Parameters<typeof serializeSearchFilters>[1]) =>
    serializeSearchFilters(routes.search, filters);

  /**
   * Une saison, telle que la recherche l'exprime maintenant : `season` **et** `year`.
   *
   * Ces deux rangées n'avaient pas de « Voir tout » — la recherche ne connaissait que l'année, et un
   * lien qui aurait élargi « été 2026 » à « 2026 » aurait mené sur une page montrant quatre fois ce
   * qu'on venait de cliquer. Le filtre existe désormais (`searchFilterParsers.season`), donc le lien
   * est exact et la restriction tombe.
   *
   * `POPULARITY` et non `TRENDING` : c'est le tri de la rangée elle-même dans
   * `BROWSE_CATALOGUE_QUERY`, et une page « Voir tout » qui reclasserait tout autrement ne serait pas
   * la suite de ce qu'on regardait.
   */
  const seasonHref = ({ season, seasonYear }: SeasonSlot) =>
    searchHref({
      type: "ANIME",
      season,
      year: seasonYear,
      sort: "POPULARITY",
      dir: "DESC",
    });

  return (
    <>
      <DiscoverySection
        description="Ce que le reste du monde regarde en ce moment."
        href={searchHref({ type: "ANIME", sort: "TRENDING", dir: "DESC" })}
        entries={entries}
        media={catalogue.trending}
        title="Tendances"
      />

      <DiscoverySection
        description={`Les animes de la saison en cours — ${formatSeason(season.season, season.seasonYear)?.toLowerCase()}.`}
        href={seasonHref(season)}
        entries={entries}
        media={catalogue.season}
        title="Cette saison"
      />

      <DiscoverySection
        description={`Ce qui arrive en ${formatSeason(upcoming.season, upcoming.seasonYear)?.toLowerCase()}.`}
        href={seasonHref(upcoming)}
        entries={entries}
        media={catalogue.upcoming}
        title="La saison prochaine"
      />

      <DiscoverySection
        description="Les meilleures notes de la communauté AniList, œuvres non diffusées exclues."
        href={searchHref({ type: "ANIME", sort: "SCORE", dir: "DESC" })}
        entries={entries}
        media={catalogue.topRated}
        title="Les mieux notés"
      />
    </>
  );
}
