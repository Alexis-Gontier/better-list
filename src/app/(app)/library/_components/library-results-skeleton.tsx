import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { LIBRARY_PAGE_SIZE } from "@/features/tracking/server/tracking.queries";

/**
 * Squelette de la bibliothèque. Le nombre de cartes vient de `LIBRARY_PAGE_SIZE`, la constante que
 * la requête utilise : c'est ce qui garantit qu'une page pleine n'ait rien à décaler quand elle
 * arrive.
 *
 * Importer une valeur d'un module `server-only` depuis un composant serveur ne pose aucun problème —
 * ce squelette n'est jamais rendu côté client, il remplit un `<Suspense>`.
 */
export function LibraryResultsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Le décompte d'œuvres, au-dessus de la grille. */}
      <Skeleton className="h-4 w-24" />

      <MediaGridSkeleton count={LIBRARY_PAGE_SIZE} />
    </div>
  );
}
