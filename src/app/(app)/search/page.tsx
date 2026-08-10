import type { Metadata } from "next";
import { Suspense } from "react";

import { ActiveFilters } from "@/app/(app)/search/_components/active-filters";
import { SearchFiltersLoader } from "@/app/(app)/search/_components/search-filters-loader";
import { SearchResults } from "@/app/(app)/search/_components/search-results";
import { SearchResultsSkeleton } from "@/app/(app)/search/_components/search-results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Rechercher",
  description: "Chercher un anime, un manga, un webtoon ou un light novel.",
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Rechercher</h1>
        <p className="text-muted-foreground text-sm">
          Animes, mangas, webtoons et light novels.
        </p>
      </header>

      {/*
        Deux frontières distinctes plutôt qu'une seule.

        La barre de filtres attend le vocabulaire (genres et tags), la grille attend les résultats.
        Ce sont deux requêtes de durées et de fraîcheurs différentes : le vocabulaire est caché en
        jours, les résultats en heures. Les réunir ferait attendre les contrôles pour rien.

        La page, elle, n'attend rien — elle ne touche pas à `searchParams` et transmet la promesse.
        C'est ce qui rend le titre instantané.
      */}
      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <SearchFiltersLoader />
      </Suspense>

      {/*
        Les puces de filtres actifs sont **hors de cette frontière**, et c'est ce qui les rend
        utiles : elles ne lisent que l'URL, donc elles s'affichent avant que le vocabulaire de la
        barre soit arrivé. Quelqu'un qui ouvre un lien partagé avec trois genres cochés sait
        immédiatement pourquoi il voit ces résultats-là, sans attendre AniList.
      */}
      <ActiveFilters />

      <Suspense fallback={<SearchResultsSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
