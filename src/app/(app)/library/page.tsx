import type { Metadata } from "next";
import { Suspense } from "react";

import { LibraryFilters } from "@/app/(app)/library/_components/library-filters";
import { LibraryResults } from "@/app/(app)/library/_components/library-results";
import { LibraryResultsSkeleton } from "@/app/(app)/library/_components/library-results-skeleton";
import { LibraryStatusNav } from "@/app/(app)/library/_components/library-status-nav";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Ma bibliothèque",
  description: "Ce que je regarde, ce que je lis, et où j'en suis.",
};

/**
 * Ma bibliothèque — le premier écran qui lit `Entry` en liste (docs/PRODUCT.md §5, V1).
 *
 * La page n'attend rien : elle transmet la promesse `searchParams` à ses enfants suspendus, et
 * l'en-tête part immédiatement. Trois frontières, parce que les trois attentes n'ont pas la même
 * durée : les onglets de statut ne dépendent que de l'URL, les résultats d'une requête base, et la
 * barre de tri de rien du tout — c'est un îlot client qui lit l'URL lui-même.
 */
export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Ma bibliothèque</h1>
        <p className="text-muted-foreground text-sm">
          Ce que je regarde, ce que je lis, et où j'en suis.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={<Skeleton className="h-8 w-full max-w-lg" />}>
          <LibraryStatusNav searchParams={searchParams} />
        </Suspense>

        <LibraryFilters />
      </div>

      <Suspense fallback={<LibraryResultsSkeleton />}>
        <LibraryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
