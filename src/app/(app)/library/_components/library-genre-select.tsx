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

/**
 * Le `<Select>` du genre — la feuille interactive du filtre, et elle seule.
 *
 * La liste des genres vient de la base : elle est calculée par le composant serveur voisin
 * (`library-genre-filter.tsx`) et descend en props. C'est ce qui permet de garder la lecture hors du
 * client sans renoncer à un contrôle piloté par `nuqs`, comme le reste de la barre.
 *
 * Comme tous les filtres de cette barre, un changement remet `page` à 1 : sans ça, choisir un genre
 * depuis la page 3 atterrit au milieu — voire au-delà — d'une liste plus courte.
 */

/** `null` n'est pas une valeur de `<Select>` : il lui faut une chaîne pour « tous ». */
const ALL = "all";

export function LibraryGenreSelect({ genres }: { genres: string[] }) {
  const [filters, setFilters] = useLibraryFilters();

  /*
    Un genre présent dans l'URL mais absent de la liste — une adresse partagée, puis la dernière
    œuvre de ce genre retirée de la bibliothèque — laisserait le déclencheur vide alors que la
    grille est bel et bien filtrée. On le rajoute donc à la liste, le temps qu'il soit relâché.
  */
  const options =
    filters.genre && !genres.includes(filters.genre)
      ? [...genres, filters.genre]
      : genres;

  return (
    <>
      <Label className="sr-only" htmlFor="library-genre">
        Genre
      </Label>
      <Select
        onValueChange={(value) =>
          setFilters({ genre: value === ALL ? null : value, page: 1 })
        }
        value={filters.genre ?? ALL}
      >
        <SelectTrigger className="w-36" id="library-genre" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tous les genres</SelectItem>
          {options.map((genre) => (
            <SelectItem key={genre} value={genre}>
              {genre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
