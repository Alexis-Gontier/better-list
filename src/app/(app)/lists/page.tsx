import type { Metadata } from "next";
import { Suspense } from "react";

import { ListCard } from "@/app/(app)/lists/_components/list-card";
import { ListsEmpty } from "@/app/(app)/lists/_components/lists-empty";
import { PageHeading } from "@/components/shared/page-heading";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getLists } from "@/features/lists/server/lists.queries";
import { getPreferences } from "@/features/preferences/server/preferences.queries";

export const metadata: Metadata = {
  title: "Mes listes",
  description: "Classements, sélections et envies de saison.",
};

/**
 * Mes listes — la grille de cartes, chacune avec ses quatre premières jaquettes.
 *
 * **La page ne fait aucun `await`.** Un `await` ici la rendrait dynamique en entier et annulerait
 * la frontière posée dessous (docs/ARCHITECTURE.md) : le titre et le trait sont statiques, et ils
 * doivent s'afficher pendant que la base répond. Une frontière par zone, jamais de `loading.tsx` de
 * segment.
 */
export default function ListsPage() {
  return (
    <div className="flex flex-col gap-6">
      {/*
        L'écart est porté par la colonne et non par le trait — la règle de `/search`, `/library` et
        de la fiche : une marge posée sur un séparateur lui ferait dicter l'espacement de ses deux
        voisins.
      */}
      <div className="flex flex-col gap-4">
        <PageHeading
          description="Ce qu'aucun statut ne sait dire : classements, sélections à faire découvrir, piles de saison."
          title="Mes listes"
        />
        <Separator />
      </div>

      <Suspense fallback={<ListsGridSkeleton />}>
        <ListsGrid />
      </Suspense>
    </div>
  );
}

/**
 * La grille, ou l'état vide — c'est la même zone, donc la même frontière.
 *
 * Les séparer aurait demandé de savoir avant la lecture s'il y a des listes, c'est-à-dire de lire
 * avant de suspendre.
 */
async function ListsGrid() {
  /*
    La préférence est lue ici et passée à la lecture, comme `/library` le fait : c'est la page qui
    connaît le visiteur, la requête qui connaît la base. `getPreferences` est la lecture mémorisée
    du dépôt — sans argument, donc `cache` de React y dédoublonne réellement.
  */
  const { includeAdult } = await getPreferences();
  const lists = await getLists({ includeAdult });

  if (lists.length === 0) return <ListsEmpty />;

  return (
    <div className={GRID_COLUMNS}>
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}

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
const GRID_COLUMNS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** Six cartes aux proportions de ce qu'elles annoncent : la mosaïque, deux lignes, le décompte. */
function ListsGridSkeleton() {
  return (
    <div className={GRID_COLUMNS}>
      {SKELETON_KEYS.map((key) => (
        <div className="flex flex-col gap-3 rounded-lg p-3" key={key}>
          <Skeleton className="aspect-8/3 w-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Des identifiants plutôt que l'indice de boucle — la convention des autres squelettes du dépôt. */
const SKELETON_KEYS = Array.from({ length: 6 }, (_, index) => `liste-${index}`);
