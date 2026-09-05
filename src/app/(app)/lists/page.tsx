import type { Metadata } from "next";

import { RouteUnderConstruction } from "@/components/shared/route-under-construction";

export const metadata: Metadata = {
  title: "Mes listes",
  description: "Classements, sélections et envies de saison.",
};

/**
 * Mes listes — vidée par la mise à blanc.
 *
 * Les huit Server Actions de `features/lists/server/lists.actions.ts` n'ont pas bougé, et leurs
 * `revalidatePath(routes.lists.root)` continuent de désigner cette route : c'est l'une des raisons
 * pour lesquelles le fichier est vidé et non supprimé.
 */
export default function ListsPage() {
  return (
    <RouteUnderConstruction
      description="Classements, sélections et envies de saison."
      title="Mes listes"
    />
  );
}
