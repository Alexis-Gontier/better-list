import type { Metadata } from "next";
import { Suspense } from "react";
import { ListsEmpty } from "@/app/(app)/lists/_components/lists-empty";
import {
  LISTS_GRID_COLUMNS,
  ListsGridSkeleton,
} from "@/app/(app)/lists/_components/lists-grid";
import { ListsHeader } from "@/app/(app)/lists/_components/lists-header";
import { ListCard } from "@/features/lists/components/list-card";
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
 * la frontière posée dessous (CLAUDE.md) : le titre et le trait sont statiques, et ils
 * doivent s'afficher pendant que la base répond. Une frontière par zone, jamais de `loading.tsx` de
 * segment.
 */
export default function ListsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ListsHeader active="mine" />

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
    <div className={LISTS_GRID_COLUMNS}>
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  );
}
