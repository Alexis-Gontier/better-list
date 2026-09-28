import { CatalogueGridSkeleton } from "@/components/shared/catalogue-grid";
import { CataloguePaginationSkeleton } from "@/components/shared/catalogue-pagination";
import { Skeleton } from "@/components/ui/skeleton";

const FACT_KEYS = Array.from({ length: 4 }, (_, index) => `fait-${index}`);
const BADGE_KEYS = Array.from({ length: 4 }, (_, index) => `nom-${index}`);

/**
 * Le repli des pages Personnage et Staff, **charpente pour charpente** avec `PersonHeader` : la
 * bande pleine largeur, le portrait qui empiète dessus, puis à sa droite le nom, les tuiles de faits
 * et la biographie. Un repli qui ne dessine pas la bande laisserait la page descendre de
 * toute sa hauteur à l'arrivée du contenu.
 */
export function PersonPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-8">
        <div className="-mt-6 relative left-1/2 h-40 w-screen -translate-x-1/2 bg-surface-raised sm:h-52" />

        <div className="-mt-24 relative grid gap-5 sm:-mt-32 sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-8 lg:grid-cols-[12rem_1fr] lg:gap-10">
          <Skeleton className="aspect-2/3 w-32 rounded-lg ring-4 ring-background sm:w-full" />
          <div className="flex flex-col gap-6 sm:pt-36">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-9 w-64 sm:h-10" />
              <Skeleton className="h-6 w-40" />
              <div className="flex flex-wrap gap-1.5">
                {BADGE_KEYS.map((key) => (
                  <Skeleton className="h-5 w-20 rounded-4xl" key={key} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {FACT_KEYS.map((key) => (
                <Skeleton className="h-14 rounded-lg" key={key} />
              ))}
            </div>
            <div className="flex max-w-prose flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </div>
      </div>

      <CatalogueGridSkeleton />
      <CataloguePaginationSkeleton />
    </div>
  );
}
