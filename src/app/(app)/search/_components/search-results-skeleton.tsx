import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { CATALOGUE_PAGE_SIZE } from "@/config/catalogue";

/**
 * Squelette de la grille de résultats. La grille et ses proportions viennent de `MediaGridSkeleton`,
 * qui est le jumeau de la grille réelle : le contenu qui arrive remplace le squelette sans décaler
 * la page.
 *
 * Le nombre de cartes vient de `CATALOGUE_PAGE_SIZE`, la constante dont le schéma de recherche tire
 * son `perPage` par défaut — c'est ce qui empêche le squelette de dériver de la page réelle, comme
 * il l'avait déjà fait une fois.
 *
 * Comme celui de la bibliothèque, il dessine toujours la grille : la page ne lit pas `searchParams`,
 * donc elle ne connaît pas la disposition demandée au moment de rendre le repli.
 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Le décompte de résultats, qui s'affiche au-dessus de la grille. */}
      <Skeleton className="h-4 w-24" />

      <MediaGridSkeleton count={CATALOGUE_PAGE_SIZE} />
    </div>
  );
}
