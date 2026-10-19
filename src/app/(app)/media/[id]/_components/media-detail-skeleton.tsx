import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Le double du hero pendant que la fiche arrive.
 *
 * **Il a les proportions de ce qu'il remplace**, et c'est tout son intérêt : un squelette générique
 * ne ressemble à rien de ce qui va s'afficher, donc il déplace la mise en page au moment où il s'en
 * va (CLAUDE.md). La bande de bannière déborde ici comme là, sinon le contenu remonterait
 * de deux cents pixels à l'arrivée des données.
 */
export function MediaDetailSkeleton() {
  return (
    <section>
      <div className="relative left-1/2 -mt-6 h-44 w-screen -translate-x-1/2 bg-surface-raised sm:h-56 lg:h-72" />

      <div className="grid gap-6 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Même calage que le hero : la jaquette s'accroche au bas de la rangée. */}
        <div className="w-40 sm:relative sm:min-h-40 sm:w-auto lg:min-h-46">
          <div className="-mt-20 sm:absolute sm:inset-x-0 sm:bottom-0 sm:mt-0">
            <Skeleton className="aspect-2/3 w-full rounded-lg" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <Skeleton className="h-9 w-3/4 sm:h-10" />
            <Skeleton className="mt-3 h-4 w-1/2" />
          </div>

          <Separator />

          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {/* Cinq colonnes, comme la ligne de faits — la sixième n'existe pas. */}
            {["format", "statut", "compteur", "saison", "credit"].map(
              (fact) => (
                <div key={fact}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </div>
              ),
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    </section>
  );
}
