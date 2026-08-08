import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * La grille de vignettes, et son squelette.
 *
 * Les deux vivent dans le **même fichier** pour une raison précise : c'est la seule façon de
 * garantir qu'ils ne divergent pas. Une grille en six colonnes et un squelette resté en cinq
 * produiraient un décalage à chaque fin de chargement — le défaut que le squelette est justement là
 * pour éviter.
 *
 * Aucune notion de métier ici : la grille ne sait pas ce qu'elle range. D'où `shared/` et non
 * `features/media/` — la recherche y met des résultats AniList, la bibliothèque des œuvres suivies.
 */

const GRID =
  "grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";

export function MediaGrid({ children }: { children: ReactNode }) {
  return <ul className={GRID}>{children}</ul>;
}

export function MediaGridSkeleton({ count }: { count: number }) {
  return (
    <ul className={GRID}>
      {Array.from({ length: count }, (_, index) => index).map((index) => (
        <li className="space-y-1.5" key={index}>
          <Skeleton className="aspect-[2/3] w-full" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
        </li>
      ))}
    </ul>
  );
}
