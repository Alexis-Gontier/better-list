import Link from "next/link";

import { routes } from "@/config/routes";
import {
  LIBRARY_STATUS_OPTIONS,
  loadLibraryFilters,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import { getLibraryStatusCounts } from "@/features/tracking/server/tracking.queries";
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
 *
 * **Chaque onglet porte son effectif**, et c'est ce qui le rend utile avant d'être cliqué : sans le
 * nombre, la seule façon de savoir s'il reste quelque chose sous « En pause » est d'y aller et de
 * revenir. Le compteur suit les autres filtres — chercher « frieren » change ce que chaque onglet
 * promet — mais jamais le statut courant, sinon tous les autres afficheraient zéro.
 */
export async function LibraryStatusNav({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = await loadLibraryFilters(searchParams);
  const { byStatus, total } = await getLibraryStatusCounts(filters);

  const tabs = [
    { value: null, label: "Tout", count: total },
    ...LIBRARY_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
      count: byStatus[option.value],
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
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 font-medium text-sm transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  /*
                    Un onglet vide reste cliquable — il n'est pas désactivé, il est atténué. Le
                    rendre inerte priverait de la seule confirmation utile : « non, il n'y a
                    vraiment rien d'abandonné ».
                  */
                  tab.count === 0 && !active && "opacity-50",
                )}
                href={serializeLibraryFilters(routes.library, {
                  ...filters,
                  status: tab.value,
                  page: 1,
                })}
              >
                {tab.label}
                {/*
                  `tabular-nums` : sans lui, les chiffres de largeurs différentes font vibrer la
                  rangée d'onglets à chaque frappe dans le champ de recherche.
                */}
                <span className="text-xs tabular-nums opacity-70">
                  {tab.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
