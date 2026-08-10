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
 * durée : la barre d'outils ne dépend de rien (c'est un îlot client qui lit l'URL lui-même), les
 * onglets de statut d'un `groupBy`, et les résultats d'une requête paginée.
 *
 * L'ordre à l'écran suit l'ordre du geste : on cherche, on restreint, on choisit un statut, on
 * regarde. La barre d'outils passe donc **avant** les onglets, alors qu'elle est le seul élément
 * qui n'attende rien — c'est aussi ce qui donne un premier rendu immédiatement utilisable.
 */
export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-semibold text-xl">Ma bibliothèque</h1>
        <p className="text-muted-foreground text-sm">
          Ce que je regarde, ce que je lis, et où j'en suis.
        </p>
      </header>

      <LibraryFilters />

      {/*
        La hauteur du repli est celle de la rangée d'onglets réelle (`h-8` + le padding du lien) :
        un squelette plus court ferait remonter toute la grille au moment où les compteurs arrivent.
      */}
      <Suspense fallback={<Skeleton className="h-8 w-full max-w-2xl" />}>
        <LibraryStatusNav searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<LibraryResultsSkeleton />}>
        <LibraryResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
