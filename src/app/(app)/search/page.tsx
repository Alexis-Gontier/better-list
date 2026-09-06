import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchFilterBar } from "@/app/(app)/search/_components/search-filter-bar";
import { getYearBounds } from "@/app/(app)/search/_lib/year-bounds";
import {
  CatalogueGrid,
  CatalogueGridSkeleton,
  WIDEST_COLUMN_COUNT,
} from "@/components/shared/catalogue-grid";
import { CataloguePagination } from "@/components/shared/catalogue-pagination";
import { Separator } from "@/components/ui/separator";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";
import { routes } from "@/config/routes";
import { MediaCard } from "@/features/media/components/media-card";
import {
  loadSearchFilters,
  resolveSort,
  serializeSearchFilters,
} from "@/features/media/lib/search-params";
import { searchMediaInMirror } from "@/features/media/server/media.mirror";
import { searchMedia } from "@/features/media/server/media.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Rechercher",
  description: "Chercher un anime, un manga, un webtoon ou un light novel.",
};

/**
 * La recherche — la barre, ses facettes, la grille et sa pagination.
 *
 * C'est le même écran que `/library`, et c'est le sujet : les deux étaient écrits deux fois avant
 * la mise à blanc (docs/STATE.md). Ils partagent la carte, la grille, la coquille de la barre et la
 * pagination (`components/shared/`), et ne diffèrent que par ce qui les distingue réellement — la
 * source. Ici AniList et ses trente requêtes par minute ; là-bas mes lignes `Entry`, en base.
 *
 * **Le repli sur le miroir local est branché**, et ce n'est pas théorique : AniList a coupé son API
 * en pleine journée le 15 août puis le 5 septembre 2026. Quand elle ne répond pas, la grille est
 * servie depuis la copie locale et l'écran dit ce qu'il y perd — un repli muet laisse croire à un
 * résultat.
 */
export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const yearBounds = await getYearBounds();

  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne, pas par les traits : une marge posée sur un séparateur lui
        ferait dicter l'espacement de ses deux voisins, et la prochaine section ajoutée ici
        arriverait avec un rythme différent selon qu'elle suit un trait ou non. Même raison que sur
        la fiche.
      */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl">Rechercher</h1>
        <Separator />
        <SearchFilterBar yearBounds={yearBounds} />
        <Separator />
      </div>

      {/*
        La grille est **suspendue** et la coquille ne l'attend pas : la barre de filtres est du HTML
        statique, elle n'a aucune raison d'attendre AniList pour s'afficher. Une frontière par zone,
        jamais de `loading.tsx` de segment (docs/ARCHITECTURE.md).
      */}
      <Suspense fallback={<CatalogueGridSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const { includeAdult, titleLanguage } = await getPreferences();
  const filters = await loadSearchFilters(searchParams);

  /*
    Le tri **effectif**, pas celui de l'URL : sans terme de recherche, `SEARCH_MATCH` n'a rien à
    comparer et `resolveSort` bascule sur les tendances. C'est la même fonction qu'appelle la barre
    pour afficher sa valeur, donc le sélecteur annonce exactement ce que la grille sert.
  */
  const sort = resolveSort({ q: filters.q, sort: filters.sort });

  const result = await searchMedia({
    search: filters.q.trim() || undefined,
    type: filters.type ?? undefined,
    formats: filters.format.length > 0 ? filters.format : undefined,
    countryOfOrigin: filters.country ?? undefined,
    status: filters.status ?? undefined,
    genres: filters.genre.length > 0 ? filters.genre : undefined,
    tags: filters.tag.length > 0 ? filters.tag : undefined,
    season: filters.season ?? undefined,
    seasonYear: filters.year ?? undefined,
    yearMin: filters.yearMin ?? undefined,
    yearMax: filters.yearMax ?? undefined,
    minimumScore: filters.score ?? undefined,
    page: filters.page,
    perPage: CATALOGUE_PAGE_SIZE,
    sortField: sort,
    sortDirection: filters.dir,
    includeAdult,
  });

  /*
    `null` veut dire « AniList n'a pas répondu » — et rien d'autre : une recherche sans résultat
    rend une page vide, pas un échec. C'est la distinction que `tryAniList` préserve, et c'est elle
    qui permet de ne se replier que sur une vraie panne.
  */
  const fallback = result
    ? null
    : await searchMediaInMirror({
        filters,
        includeAdult,
        page: filters.page,
        perPage: CATALOGUE_PAGE_SIZE,
      });

  const { items, page, pageCount } = result ?? fallback ?? EMPTY_RESULT;

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {/*
        Le bandeau de panne, lui, est global et vient du layout : ce mot-ci dit ce que **cette
        recherche** a perdu, ce que le bandeau ne peut pas savoir. Les deux ne font pas doublon —
        l'un annonce l'incident, l'autre ses conséquences sur la question posée.
      */}
      {fallback && fallback.lost.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          Résultats servis depuis la copie locale
          {fallback.lost.includes("tags") ? ", sans le filtre par tags" : ""}
          {fallback.lost.includes("sort")
            ? ", et sans le tri demandé — le miroir ne connaît ni les tendances ni la popularité"
            : ""}
          .
        </p>
      ) : null}

      <CatalogueGrid>
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            media={item}
            // La première rangée au palier le plus large : c'est tout ce qui est au-dessus de la
            // ligne de flottaison, et la première de ces jaquettes porte la mesure de LCP.
            priority={index < WIDEST_COLUMN_COUNT}
            titleLanguage={titleLanguage}
          />
        ))}
      </CatalogueGrid>

      <CataloguePagination
        hrefFor={(target) =>
          serializeSearchFilters(routes.search, { ...filters, page: target })
        }
        page={page}
        pageCount={pageCount}
      />
    </div>
  );
}

/**
 * Ce qu'on rend quand ni AniList ni le miroir n'ont donné quoi que ce soit.
 *
 * Une constante plutôt qu'un troisième `if` : les deux chemins produisent déjà la même forme, et le
 * cas « les deux ont échoué » n'a pas besoin d'une branche à lui. Le repli sur le miroir ne peut
 * pas rendre `null`, donc cette valeur n'est atteinte que si le calcul change un jour — elle est là
 * pour que ce jour-là le type le dise, pas pour couvrir un cas d'aujourd'hui.
 */
const EMPTY_RESULT = { items: [], page: 1, pageCount: 1 } as const;
