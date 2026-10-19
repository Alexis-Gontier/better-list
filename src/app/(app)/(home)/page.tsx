import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FeaturedSpotlight } from "@/app/(app)/(home)/_components/home-cards";
import {
  TrackedMediaCard,
  trackingDetails,
} from "@/app/(app)/(home)/_components/home-media-card";
import { HomeRail } from "@/app/(app)/(home)/_components/home-rail";
import { SpotlightCarousel } from "@/app/(app)/(home)/_components/spotlight-carousel";
import {
  loadRecommendations,
  loadSeason,
  loadSeasonEntries,
  loadTracking,
  loadTrending,
  loadTrendingEntries,
} from "@/app/(app)/(home)/_lib/home-data";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { mediaTitle } from "@/features/media/lib/media-format";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
import { CatalogueMediaCard } from "@/features/tracking/components/catalogue-media-card";
import { serializeLibraryFilters } from "@/features/tracking/lib/library-params";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Reprendre où on s'est arrêté, et voir ce qui sort en ce moment.",
};

/**
 * L'accueil — **du plus personnel au plus général**.
 *
 * 1. À la une : les tendances qui ont une bannière, en carrousel — **et où j'en suis** sur celles
 *    que je suis déjà.
 * 2. En cours, **ce qui vient de sortir en tête**.
 * 3. — un trait —
 * 4. Tendances, puis Cette saison.
 * 5. Recommandé pour vous, tiré de ce que je regarde en ce moment.
 *
 * **Toutes les jaquettes sont la `MediaCard` du catalogue**, aux paliers de `CatalogueGrid` : une
 * œuvre a la même apparence et le même geste — pastille de statut, fenêtre d'édition au survol —
 * ici, sur `/search` et sur `/library`.
 *
 * L'ordre fait tout le travail (docs/conception.md §5) : le suivi passe avant la découverte. Chaque
 * zone a sa propre frontière et s'affiche dès qu'elle est prête, sans attendre les autres.
 *
 * **La rangée « Du moment » et ses quatre onglets ont été retirées le 14 septembre 2026** (décision
 * d'Alexis). Elles posaient au milieu de l'accueil un second catalogue — animes, mangas, webtoons,
 * webtoons +18 — que `/search` fait mieux, et dont l'onglet animes faisait doublon avec « Cette
 * saison » juste en dessous. Ce que l'accueil a de propre, c'est mon suivi ; trois requêtes AniList
 * partent avec elles.
 *
 * **Deux rangées sont parties le 17 septembre 2026** (décisions d'Alexis).
 *
 * « À reprendre » d'abord : elle montrait les séries en pause, rangées sur ce qu'il restait à
 * finir. C'est une pile qu'on consulte quand on décide d'y revenir, pas quelque chose qu'on veut
 * voir chaque fois qu'on arrive — et `/library?status=PAUSED`, où son titre menait, la montre en
 * entier. L'accueil ne garde de mon suivi que ce qui est **en cours**.
 *
 * « Mes listes » ensuite, et pour une
 * raison voisine : elle montrait au milieu de l'accueil ce que `/lists` montre en entier, avec sa
 * mosaïque, sa création et son état vide. Une rangée qui ne fait que résumer un écran voisin, sur
 * un produit à quatre comptes qui tiennent chacun trois ou quatre listes, coûte un défilement pour
 * une information déjà à un clic dans la navigation. L'accueil est désormais mon suivi, puis la
 * découverte — et rien qui double un autre écran.
 *
 * Le fichier reste de toute façon : `routes.home` est la redirection d'après connexion, le
 * `callbackURL` GitHub, la sortie de la liste d'attente et le repli de `proxy.ts`.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <Suspense fallback={<SpotlightSkeleton />}>
        <Spotlight />
      </Suspense>

      {/* `details` : chaque carte d'« En cours » porte son retard ou sa progression sous le titre. */}
      <Suspense fallback={<RailSkeleton details />}>
        <Tracking />
      </Suspense>

      {/*
        **Le trait qui sépare mon suivi de la découverte** (demande d'Alexis, 17 septembre 2026).
        Au-dessus, ce qui est à moi ; en dessous, ce que le catalogue propose. C'est la seule
        frontière de l'accueil que l'ordre seul ne rendait pas lisible : les rangées se ressemblent
        toutes, et rien ne disait où l'on passait de l'une à l'autre.

        **Sans marge propre** : l'écart est porté par la colonne, comme sur `/search`, `/library`,
        `/lists` et la fiche. Une marge posée sur un séparateur lui ferait dicter l'espacement de
        ses deux voisins, et la prochaine zone ajoutée ici arriverait avec un rythme différent selon
        qu'elle suit un trait ou non.

        **Il est dans la coquille statique, pas dans une zone suspendue**, et c'est un arbitrage
        assumé. Le prix : AniList muette rend les deux rangées du dessous vides, et la page se
        termine alors par un trait seul — sur un écran qui porte déjà le bandeau de panne et qui a
        perdu son carrousel. Le gagner reviendrait à faire rendre le trait par la rangée des
        tendances, donc à le faire arriver en flux : il faudrait le poser aussi dans `RailSkeleton`,
        partagé avec la rangée de saison qui n'en veut pas. Un trait stable qui traîne une fois par
        panne vaut mieux qu'un trait qui saute à chaque chargement.
      */}
      <Separator />

      <Suspense fallback={<RailSkeleton />}>
        <TrendingRail />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <SeasonRail />
      </Suspense>

      {/* `details` : chaque carte nomme la série en cours qui l'a amenée. */}
      <Suspense fallback={<RailSkeleton details />}>
        <RecommendationsRail />
      </Suspense>
    </div>
  );
}

// --- À la une ------------------------------------------------------------------

/** Combien de tendances à la une. */
const SPOTLIGHT_COUNT = 6;

async function Spotlight() {
  const [{ anime, titleLanguage }, entries] = await Promise.all([
    loadTrending(),
    loadTrendingEntries(),
  ]);
  const featured = anime
    .filter((media) => media.bannerImage !== null)
    .slice(0, SPOTLIGHT_COUNT);
  if (featured.length === 0) return null;

  return (
    <SpotlightCarousel>
      {featured.map((media, index) => (
        <FeaturedSpotlight
          entry={entries.get(media.id) ?? null}
          key={media.id}
          media={media}
          priority={index === 0}
          titleLanguage={titleLanguage}
        />
      ))}
    </SpotlightCarousel>
  );
}

// --- Mon suivi -------------------------------------------------------------------

/**
 * Mon suivi — **une rangée, « En cours »**.
 *
 * **Elle mène avec ce qui vient de sortir** : les séries dont un épisode est tombé passent en tête
 * et disent leur retard, les autres disent où j'en suis (`trackingDetails`). Elles ont eu leur
 * propre rangée le temps d'une passe, le 14 septembre 2026 ; elle montrait les mêmes jaquettes que
 * celle du dessous, à trois près, et Alexis a demandé la fusion. Le classement se fait dans
 * `loadTracking`, qui a les données pour.
 *
 * **« À reprendre » l'accompagnait jusqu'au 17 septembre 2026**, avec les séries en pause rangées
 * sur ce qu'il restait à finir. Elle est partie sur décision d'Alexis : reprendre une série en
 * pause est une intention qu'on a en allant la chercher, pas une chose à proposer à chaque
 * arrivée. `/library?status=PAUSED` la montre en entier.
 */
async function Tracking() {
  const { active, titleLanguage } = await loadTracking();

  /*
    Un compte neuf n'a rien en cours : sans ce message, l'accueil passerait directement du carrousel
    au catalogue, et rien ne dirait par où commencer.
  */
  if (active.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Rien en cours pour l'instant</EmptyTitle>
          <EmptyDescription>
            Cherchez une œuvre et ajoutez-la à votre bibliothèque : elle
            apparaîtra ici, avec sa progression.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href={routes.search}>
              <SearchIcon data-icon="inline-start" />
              Parcourir le catalogue
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <HomeRail
      href={serializeLibraryFilters(routes.library, { status: "CURRENT" })}
      title="En cours"
    >
      {active.map((item) => (
        <TrackedMediaCard
          details={trackingDetails(item)}
          item={item}
          key={item.media.id}
          titleLanguage={titleLanguage}
        />
      ))}
    </HomeRail>
  );
}

// --- Découverte ------------------------------------------------------------------

/**
 * Les tendances du moment, **en jaquettes** — la rangée que le carrousel du haut ne remplace pas.
 *
 * Elle ne coûte **aucune requête** : `loadTrending` est déjà lue par la une, qui n'en garde que six
 * — celles qui ont une bannière — et laisse les quatorze autres sans écran. `cache` de React sert
 * ici la même réponse.
 *
 * **Les six de la une y figurent quand même.** Une rangée « Tendances » qui commencerait au
 * septième mentirait sur son titre ; et une bannière pleine largeur qui tourne toute seule ne se
 * lit pas comme une jaquette de trois centimètres — c'est le même classement montré deux fois, pas
 * deux fois la même chose.
 *
 * Des animes, comme la une : c'est une seule recherche AniList pour les deux, et un classement de
 * tendances mêlant les types serait de toute façon entièrement pris par eux.
 */
async function TrendingRail() {
  const [{ anime, titleLanguage }, entries] = await Promise.all([
    loadTrending(),
    loadTrendingEntries(),
  ]);
  if (anime.length === 0) return null;

  return (
    <HomeRail
      href={serializeSearchFilters(routes.search, {
        type: "ANIME",
        sort: "TRENDING",
      })}
      title="Tendances"
    >
      {anime.map((media) => (
        <CatalogueMediaCard
          entry={entries.get(media.id) ?? null}
          key={media.id}
          media={media}
          titleLanguage={titleLanguage}
        />
      ))}
    </HomeRail>
  );
}

async function SeasonRail() {
  const [{ seasonal, season, titleLanguage }, entries] = await Promise.all([
    loadSeason(),
    loadSeasonEntries(),
  ]);
  if (seasonal.length === 0) return null;

  return (
    <HomeRail
      href={serializeSearchFilters(routes.search, {
        type: "ANIME",
        season: season.season,
        year: season.seasonYear,
        sort: "POPULARITY",
      })}
      title="Cette saison"
    >
      {seasonal.map((media) => (
        <CatalogueMediaCard
          entry={entries.get(media.id) ?? null}
          key={media.id}
          media={media}
          titleLanguage={titleLanguage}
        />
      ))}
    </HomeRail>
  );
}

/**
 * « Recommandé pour vous » — **en bas de page** (décision d'Alexis du 28 septembre 2026), après
 * les deux rangées du catalogue plutôt qu'à la place de « Cette saison », comme une version antérieure
 * l'envisageait.
 *
 * Chaque carte dit **d'où elle vient** : une recommandation qu'on ne sait pas expliquer est une
 * jaquette de plus parmi quarante. La ligne nomme la série en cours qui a le plus pesé pour elle.
 *
 * Pas de lien sur le titre : aucun écran ne montre cette liste en entier.
 */
async function RecommendationsRail() {
  const { recommendations, titleLanguage } = await loadRecommendations();
  if (recommendations.length === 0) return null;

  return (
    <HomeRail title="Recommandé pour vous">
      {recommendations.map(({ media, because }) => (
        <CatalogueMediaCard
          details={[`Comme ${mediaTitle(because.title, titleLanguage)}`]}
          entry={null}
          key={media.id}
          media={media}
          titleLanguage={titleLanguage}
        />
      ))}
    </HomeRail>
  );
}

// --- Squelettes --------------------------------------------------------------------

const RAIL_SKELETON_KEYS = Array.from({ length: 7 }, (_, i) => `rail-${i}`);

/** Les points de la une, moins celui de la diapositive courante, qui est plus large. */
const DOT_SKELETON_KEYS = Array.from(
  { length: SPOTLIGHT_COUNT - 1 },
  (_, i) => `point-${i}`,
);

/**
 * Le double de la une : la diapositive, **et la rangée de points sous elle**.
 *
 * Le repli s'arrêtait à la diapositive, alors que `SpotlightCarousel` empile les deux avec un
 * `gap-4` : vingt-deux pixels de moins que ce qui arrive, et tout l'accueil descendait d'autant au
 * remplacement. Il déborde du `main` comme le carrousel, sur toute la largeur de la fenêtre, et
 * reprend sa géométrie : trois diapositives à la largeur du contenu (`100cqw`), `px-2`, centrées par
 * `justify-center` — celle du milieu tombe sur le contenu, ses voisines dépassent jusqu'aux bords,
 * atténuées. Sans elles, le carrousel remplirait d'un coup deux marges vides en arrivant.
 */
function SpotlightSkeleton() {
  return (
    <div className="@container">
      <div className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col gap-4">
        <div className="flex justify-center overflow-hidden">
          <div className="shrink-0 basis-[calc(100cqw+1rem)] px-2 opacity-40">
            <Skeleton className="h-72 rounded-xl sm:h-96" />
          </div>
          <div className="shrink-0 basis-[calc(100cqw+1rem)] px-2">
            <Skeleton className="h-72 rounded-xl sm:h-96" />
          </div>
          <div className="shrink-0 basis-[calc(100cqw+1rem)] px-2 opacity-40">
            <Skeleton className="h-72 rounded-xl sm:h-96" />
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-1.5 w-6 rounded-full" />
            {DOT_SKELETON_KEYS.map((key) => (
              <Skeleton className="size-1.5 rounded-full" key={key} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Le double d'une rangée de jaquettes.
 *
 * Aux proportions de `CatalogueGrid` : trois colonnes, sept dès `lg`, même gouttière. **L'en-tête
 * porte aussi ses deux flèches** — elles font 36 px là où le titre seul en fait 28, et la rangée
 * sautait de huit à leur arrivée. Elles sont cachées sous `sm`, comme dans `HomeRail`.
 */
function RailSkeleton({ details = false }: { details?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-7 w-48" />
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
        </div>
      </div>

      <div className="flex gap-3 overflow-hidden">
        {RAIL_SKELETON_KEYS.map((key) => (
          <div
            className="flex w-[calc((100%-1.5rem)/3)] shrink-0 flex-col gap-2 lg:w-[calc((100%-4.5rem)/7)]"
            key={key}
          >
            <Skeleton className="aspect-2/3 w-full rounded-md" />
            {/*
              `gap-0.5` entre le titre et sa ligne d'appoint, comme dans `MediaCard` — et `h-5`
              pour le titre (`text-sm`, 20 px d'interligne), `h-4` pour la ligne (`text-xs`, 16).
            */}
            <div className="flex flex-col gap-0.5">
              <Skeleton className="h-5 w-4/5" />
              {details ? <Skeleton className="h-4 w-3/5" /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
