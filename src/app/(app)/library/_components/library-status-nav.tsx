import Link from "next/link";

import { routes } from "@/config/routes";
import {
  LIBRARY_STATUS_OPTIONS,
  loadLibraryFilters,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import { cn } from "@/lib/utils";

/**
 * Le filtre par statut, en liens et non en boutons.
 *
 * C'est l'axe principal de la bibliothèque — « qu'est-ce que je regarde en ce moment » —, donc il
 * mérite d'être partageable, préchargeable et navigable avant l'hydratation. Aucun état, aucun
 * JavaScript : ce composant reste serveur, là où la barre de tri voisine est un îlot client.
 *
 * Chaque lien **repart de la page 1** : filtrer depuis la page 3 laisserait `page=3` dans l'URL, et
 * un statut moins fourni afficherait une grille vide qu'on lirait comme « rien ne correspond ».
 */
export async function LibraryStatusNav({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await loadLibraryFilters(searchParams);

  const tabs = [
    { value: null, label: "Tout" },
    ...LIBRARY_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <nav aria-label="Filtrer par statut">
      <ul className="flex flex-wrap items-center gap-1">
        {tabs.map((tab) => {
          const active = filters.status === tab.value;

          return (
            <li key={tab.value ?? "all"}>
              <Link
                // `aria-current` plutôt qu'une simple couleur : l'onglet actif doit s'entendre
                // autant qu'il se voit.
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center rounded-md px-3 font-medium text-sm transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                href={serializeLibraryFilters(routes.library, {
                  ...filters,
                  status: tab.value,
                  page: 1,
                })}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
