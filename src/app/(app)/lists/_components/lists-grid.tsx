import { Skeleton } from "@/components/ui/skeleton";

/**
 * Trois colonnes larges au plus, et **pas la grille du catalogue**.
 *
 * `catalogue-grid` pose sept colonnes de jaquettes : c'est la bonne densité pour des œuvres, pas
 * pour des cartes qui portent chacune quatre jaquettes, un titre, une description et un décompte.
 * C'est `/lists/[id]` qui héritera de la coquille du catalogue, parce qu'elle range des œuvres.
 *
 * Une seule colonne sur téléphone : à deux, la mosaïque tomberait sous les 40 px par jaquette,
 * c'est-à-dire sous le seuil où l'on reconnaît une illustration.
 */
export const LISTS_GRID_COLUMNS =
  "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Six cartes aux proportions de ce qu'elles annoncent : la mosaïque, deux lignes, le décompte. */
export function ListsGridSkeleton() {
  return (
    <div className={LISTS_GRID_COLUMNS}>
      {SKELETON_KEYS.map((key) => (
        // La charpente de `ListCard` : couchée sur téléphone, debout dès `sm`.
        <div className="flex gap-3 rounded-lg border p-3 sm:flex-col" key={key}>
          <Skeleton className="h-36 w-24 shrink-0 sm:h-auto sm:w-full sm:aspect-8/3" />
          {/*
            `gap-1` comme la carte, et les interlignes réels : le titre hérite du corps de texte
            (24 px), la description en fait deux de `text-sm` (40), le décompte un de `text-xs` (16).
          */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="mt-auto h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Des identifiants plutôt que l'indice de boucle — la convention des autres squelettes du dépôt. */
const SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `liste-${index}`);
