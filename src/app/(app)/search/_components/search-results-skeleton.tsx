import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de la grille de résultats. La grille et ses proportions viennent de `MediaGridSkeleton`,
 * qui est le jumeau de la grille réelle : le contenu qui arrive remplace le squelette sans décaler
 * la page.
 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Le décompte de résultats, qui s'affiche au-dessus de la grille. */}
      <Skeleton className="h-4 w-24" />

      {/* Vingt cartes — autant que le `perPage` par défaut du schéma de recherche. */}
      <MediaGridSkeleton count={20} />
    </div>
  );
}
