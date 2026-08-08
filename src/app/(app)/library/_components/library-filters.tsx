"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLibraryFilters } from "@/features/tracking/hooks/use-library-filters";
import {
  LIBRARY_SORT_OPTIONS,
  LIBRARY_TYPE_OPTIONS,
  type LibrarySort,
} from "@/features/tracking/lib/library-params";

/**
 * Type d'œuvre et tri. Seul îlot client de la page — le filtre par statut, lui, est en liens
 * serveur.
 *
 * Comme sur la recherche, chaque changement remet `page` à 1 : sans ça, changer de tri depuis la
 * page 3 garde `page=3` et l'utilisateur atterrit au milieu d'une liste réordonnée.
 */

/** `null` n'est pas une valeur de `<Select>` : il lui faut une chaîne pour « tous ». */
const ALL = "all";

export function LibraryFilters() {
  const [filters, setFilters] = useLibraryFilters();

  return (
    <div className="flex items-center gap-2">
      <Label className="sr-only" htmlFor="library-type">
        Type d'œuvre
      </Label>
      <Select
        onValueChange={(value) =>
          setFilters({
            type:
              value === ALL
                ? null
                : (value as (typeof LIBRARY_TYPE_OPTIONS)[number]["value"]),
            page: 1,
          })
        }
        value={filters.type ?? ALL}
      >
        <SelectTrigger className="w-36" id="library-type" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les types</SelectItem>
          {LIBRARY_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label className="sr-only" htmlFor="library-sort">
        Trier par
      </Label>
      <Select
        onValueChange={(value) =>
          setFilters({ sort: value as LibrarySort, page: 1 })
        }
        value={filters.sort}
      >
        <SelectTrigger className="w-44" id="library-sort" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LIBRARY_SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
