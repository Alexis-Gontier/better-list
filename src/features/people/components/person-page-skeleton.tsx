import { CatalogueGridSkeleton } from "@/components/shared/catalogue-grid";
import { CataloguePaginationSkeleton } from "@/components/shared/catalogue-pagination";
import { Skeleton } from "@/components/ui/skeleton";

/** Le repli des pages Personnage et Staff : en-tête, grille, pagination, aux mêmes proportions. */
export function PersonPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 sm:flex-row">
        <Skeleton className="aspect-2/3 w-40 rounded-md sm:w-48" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
      <CatalogueGridSkeleton />
      <CataloguePaginationSkeleton />
    </div>
  );
}
