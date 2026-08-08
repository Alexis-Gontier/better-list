import { MediaGridSkeleton } from "@/components/shared/media-grid";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Attente du tableau de bord.
 *
 * Deux rangées de vignettes et un bloc de lignes : les proportions des sections réelles, pour que
 * l'arrivée du contenu ne pousse pas la page. On ne dessine pas les trois sections — une
 * bibliothèque jeune n'en aura qu'une, et un squelette trop long ment plus qu'il n'aide.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <MediaGridSkeleton count={6} />
      </section>

      <section className="space-y-3">
        <Skeleton className="h-5 w-32" />

        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </section>
    </div>
  );
}
