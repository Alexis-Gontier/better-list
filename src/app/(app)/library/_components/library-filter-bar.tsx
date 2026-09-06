"use client";

import {
  type ActiveFilterChip,
  FilterBar,
  FilterSearchField,
  FilterSelect,
  labelOf,
} from "@/components/shared/filter-bar";
import {
  LIBRARY_SORT_OPTIONS,
  LIBRARY_TYPE_OPTIONS,
  type LibrarySort,
  libraryFilterParsers,
} from "@/features/tracking/lib/library-params";
import { useUrlFilters } from "@/hooks/use-url-filters";

/**
 * La barre de ma bibliothèque — le terme, le type, le tri.
 *
 * Elle compose la même coquille que `/search` (`components/shared/filter-bar.tsx`) et n'écrit,
 * comme elle, que dans l'URL : les parseurs viennent du contrat gelé (`library-params.ts`), donc
 * ce que la barre écrit est exactement ce que la grille relira côté serveur.
 *
 * **Deux différences avec la recherche, et toutes deux viennent de la source.**
 *
 * 1. **Pas d'anti-rebond.** Chaque frappe de `/search` coûte une requête AniList sur les trente que
 *    la minute partage ; ici elle tape en base, sur mes quelques centaines de lignes. Espacer la
 *    saisie ne protégerait rien et rendrait le champ moins vif pour rien.
 * 2. **Pas de bouton « Filtres », donc pas de panneau.** Le statut — de loin le plus employé — a
 *    déjà sa rangée en tête d'écran, et ce qui reste tient en trois contrôles alignés. Le jour où
 *    ma note, ma progression ou le cœur rejoindront le contrat (docs/recherche-filtres.md §2.1),
 *    le panneau se justifiera — et les primitives de `/search` seront à promouvoir à ce moment-là,
 *    pas avant.
 *
 * **Le genre n'est pas de la partie, et c'est une décision d'Alexis du 6 septembre 2026.** Il avait
 * sa place ici par symétrie avec `/search`, mais les deux écrans ne répondent pas à la même
 * question : on cherche un genre dans un catalogue de dizaines de milliers d'œuvres, on ne le
 * cherche pas dans quelques centaines de lignes qu'on a soi-même choisies — le terme et le statut y
 * arrivent plus vite. Le sélecteur est parti avec son paramètre d'URL et la lecture qui le
 * remplissait (`getLibraryGenres`), plutôt que de rester branché dans le vide.
 */

/** Les valeurs closes, tirées des listes d'options : c'est l'écran qui décide de ce qu'il propose. */
type LibraryKind = (typeof LIBRARY_TYPE_OPTIONS)[number]["value"];

/**
 * Ce que la barre pilote. Le statut n'y est pas : il appartient à la rangée de tête, qui l'écrit
 * par des liens. Deux contrôles pour un même paramètre finiraient par se contredire.
 */
const barParsers = {
  q: libraryFilterParsers.q,
  type: libraryFilterParsers.type,
  sort: libraryFilterParsers.sort,
  page: libraryFilterParsers.page,
};

/**
 * Les valeurs de remise à zéro.
 *
 * Elles sont écrites ici plutôt que reprises d'un `EMPTY_FILTERS` : la bibliothèque n'en a pas —
 * son contrat est assez court pour que la liste tienne sous les yeux, et le compilateur la garde
 * alignée sur `barParsers`. `status` en est absent pour la raison ci-dessus ; « Tout effacer »
 * n'emporte donc pas l'onglet choisi, ce qui est le bon geste : on efface les filtres, on ne
 * quitte pas la vue.
 */
const RESET_FILTERS = {
  q: "",
  type: null,
  sort: "recent" as LibrarySort,
  page: 1,
};

export function LibraryFilterBar() {
  const [filters, setFilters] = useUrlFilters(barParsers);

  /** Toute facette qui change ramène à la première page — sinon on atterrit sur une page vide. */
  const update = (next: Partial<typeof filters>) =>
    setFilters({ ...next, page: 1 });

  /*
    Les facettes posées. Le terme est lisible dans son champ, le tri a toujours une valeur, et le
    statut est déjà marqué dans la rangée de tête — une puce le redirait une deuxième fois, à un
    endroit d'où on pourrait le retirer sans que l'onglet actif suive.
  */
  const chips: ActiveFilterChip[] = [];

  if (filters.type)
    chips.push({
      label: labelOf(LIBRARY_TYPE_OPTIONS, filters.type),
      onRemove: () => update({ type: null }),
    });

  /*
    Le terme, le tri et la page n'ont pas de puce, et suffisent pourtant à se retrouver page 8
    triée par titre sans moyen visible de revenir. La rangée s'affiche donc aussi pour eux — même
    correctif que sur `/search`, parce que c'est le même angle mort.

    Le statut n'entre pas dans ce calcul : il a sa rangée d'onglets, qui montre déjà lequel est
    posé et permet de revenir à « Tout » d'un clic.
  */
  const canClear =
    filters.q !== RESET_FILTERS.q ||
    filters.sort !== RESET_FILTERS.sort ||
    filters.page !== RESET_FILTERS.page;

  return (
    <FilterBar
      canClear={canClear}
      chips={chips}
      onClearAll={() => setFilters(RESET_FILTERS)}
    >
      <FilterSearchField
        label="Chercher dans ma bibliothèque"
        onValueChange={(q) => update({ q })}
        placeholder="Un titre que je suis déjà…"
        value={filters.q}
      />

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          anyLabel="Tous"
          ariaLabel="Type d'œuvre"
          className="w-40"
          label="Type"
          onValueChange={(type: LibraryKind | null) => update({ type })}
          options={LIBRARY_TYPE_OPTIONS}
          value={filters.type}
        />

        {/* Pas d'`anyLabel` : le tri a toujours une valeur, donc aucun cas nul à traiter. */}
        <FilterSelect
          ariaLabel="Trier par"
          className="w-52"
          label="Tri"
          onValueChange={(sort: LibrarySort) => update({ sort })}
          options={LIBRARY_SORT_OPTIONS}
          value={filters.sort}
        />
      </div>
    </FilterBar>
  );
}
