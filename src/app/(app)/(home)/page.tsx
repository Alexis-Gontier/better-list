import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import {
  FeaturedSpotlight,
  ListTile,
} from "@/app/(app)/(home)/_components/home-cards";
import {
  CatalogueMediaCard,
  resumeDetails,
  TrackedMediaCard,
  trackingDetails,
} from "@/app/(app)/(home)/_components/home-media-card";
import { HomeRail } from "@/app/(app)/(home)/_components/home-rail";
import { SpotlightCarousel } from "@/app/(app)/(home)/_components/spotlight-carousel";
import {
  loadLists,
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
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/config/routes";
import { serializeSearchFilters } from "@/features/media/lib/search-params";
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
 * 2. En cours — **ce qui vient de sortir en tête** —, puis À reprendre.
 * 3. Mes listes.
 * 4. Tendances, puis Cette saison.
 *
 * **Toutes les jaquettes sont la `MediaCard` du catalogue**, aux paliers de `CatalogueGrid` : une
 * œuvre a la même apparence et le même geste — pastille de statut, fenêtre d'édition au survol —
 * ici, sur `/search` et sur `/library`.
 *
 * L'ordre fait tout le travail (docs/PRODUCT.md §5) : le suivi passe avant la découverte. Chaque
 * zone a sa propre frontière et s'affiche dès qu'elle est prête, sans attendre les autres.
 *
 * **La rangée « Du moment » et ses quatre onglets ont été retirées le 14 septembre 2026** (décision
 * d'Alexis). Elles posaient au milieu de l'accueil un second catalogue — animes, mangas, webtoons,
 * webtoons +18 — que `/search` fait mieux, et dont l'onglet animes faisait doublon avec « Cette
 * saison » juste en dessous. Ce que l'accueil a de propre, c'est mon suivi ; trois requêtes AniList
 * partent avec elles.
 *
 * Le fichier reste de toute façon : `routes.home` est la redirection d'après connexion, le
 * `callbackURL` GitHub, la sortie de la liste d'attente et le repli de `proxy.ts`.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <Suspense
        fallback={<Skeleton className="h-72 w-full rounded-xl sm:h-96" />}
      >
        <Spotlight />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <Tracking />
      </Suspense>

      <Suspense fallback={null}>
        <ListsRail />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <TrendingRail />
      </Suspense>

      <Suspense fallback={<RailSkeleton />}>
        <SeasonRail />
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
 * Mon suivi, en deux rangées.
 *
 * **« En cours » mène avec ce qui vient de sortir** : les séries dont un épisode est tombé passent
 * en tête et disent leur retard, les autres disent où j'en suis (`trackingDetails`). Elles ont eu
 * leur propre rangée le temps d'une passe, le 14 septembre 2026 ; elle montrait les mêmes jaquettes
 * que celle du dessous, à trois près, et Alexis a demandé la fusion. Le classement se fait dans
 * `loadTracking`, qui a les données pour.
 *
 * « À reprendre » garde la sienne : ce sont des séries en pause, donc une autre décision — y
 * revenir — et une autre information, depuis quand.
 */
async function Tracking() {
  const { active, resumable, titleLanguage } = await loadTracking();

  /*
    Un compte neuf n'a rien en cours ni rien à reprendre : sans ce message, l'accueil passerait
    directement du carrousel au catalogue, et rien ne dirait par où commencer.
  */
  if (active.length === 0 && resumable.length === 0) {
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

  const now = new Date();

  return (
    <>
      {active.length > 0 ? (
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
      ) : null}

      {resumable.length > 0 ? (
        <HomeRail
          href={serializeLibraryFilters(routes.library, { status: "PAUSED" })}
          title="À reprendre"
        >
          {resumable.map((item) => (
            <TrackedMediaCard
              details={resumeDetails(item, now)}
              item={item}
              key={item.media.id}
              titleLanguage={titleLanguage}
            />
          ))}
        </HomeRail>
      ) : null}
    </>
  );
}

async function ListsRail() {
  const lists = await loadLists();
  if (lists.length === 0) return null;

  return (
    <HomeRail href={routes.lists.root} size="wide" title="Mes listes">
      {lists.map((list) => (
        <ListTile key={list.id} list={list} />
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

// --- Squelettes --------------------------------------------------------------------

const RAIL_SKELETON_KEYS = Array.from({ length: 7 }, (_, i) => `rail-${i}`);

/** Aux proportions de `CatalogueGrid` : trois colonnes, sept dès `lg`, même gouttière. */
function RailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-7 w-48" />
      <div className="flex gap-3 overflow-hidden">
        {RAIL_SKELETON_KEYS.map((key) => (
          <div
            className="flex w-[calc((100%-1.5rem)/3)] shrink-0 flex-col gap-2 lg:w-[calc((100%-4.5rem)/7)]"
            key={key}
          >
            <Skeleton className="aspect-2/3 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
