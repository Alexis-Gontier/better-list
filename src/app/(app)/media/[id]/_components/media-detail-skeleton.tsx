import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Le double du hero pendant que la fiche arrive.
 *
 * **Il a les proportions de ce qu'il remplace**, et c'est tout son intérêt : un squelette générique
 * ne ressemble à rien de ce qui va s'afficher, donc il déplace la mise en page au moment où il s'en
 * va (docs/ARCHITECTURE.md). La bande de bannière déborde ici comme là, sinon le contenu remonterait
 * de deux cents pixels à l'arrivée des données.
 */
export function MediaDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
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

      <Separator />

      {/*
        Le bas de la fiche aussi a ses proportions : la barre d'onglets, un paragraphe, et la
        colonne de référence à droite. **Le nombre d'onglets n'est pas connu ici** — il dépend de ce
        qu'AniList renvoie —, donc on en dessine trois : le compte le plus fréquent, et l'écart
        d'un onglet ne déplace rien puisque la barre est alignée à gauche.
      */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-10">
        <div className="flex flex-col gap-6">
          <div className="flex gap-6 border-b pb-3">
            {["apercu", "distribution", "journal"].map((tab) => (
              <Skeleton className="h-4 w-20" key={tab} />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            {["l1", "l2", "l3", "l4"].map((line) => (
              <Skeleton className="h-3 w-full max-w-prose" key={line} />
            ))}
            <Skeleton className="h-3 w-2/3 max-w-prose" />
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:border-l lg:pl-8">
          {["specs", "communaute", "liens"].map((block) => (
            <div className="flex flex-col gap-3" key={block}>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
