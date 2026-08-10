"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { debounce } from "nuqs";
import { useRef } from "react";

import { ViewToggle } from "@/components/shared/view-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group";
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
 * Recherche, type d'œuvre, tri et disposition. Seul îlot client de la page — le filtre par statut,
 * lui, est en liens serveur.
 *
 * Comme sur la recherche, chaque changement remet `page` à 1 : sans ça, changer de tri depuis la
 * page 3 garde `page=3` et l'utilisateur atterrit au milieu d'une liste réordonnée.
 */

/** `null` n'est pas une valeur de `<Select>` : il lui faut une chaîne pour « tous ». */
const ALL = "all";

export function LibraryFilters() {
  const [filters, setFilters] = useLibraryFilters();

  /**
   * Le champ est **non contrôlé** — `defaultValue` et non `value`.
   *
   * L'écriture dans l'URL est anti-rebondie : un champ contrôlé par `filters.q` reviendrait donc à
   * la valeur d'il y a 300 ms à chaque frappe, et le curseur sauterait en fin de champ. La `ref` ne
   * sert qu'au bouton d'effacement, qui doit vider ce que React ne pilote pas.
   */
  const inputRef = useRef<HTMLInputElement>(null);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setFilters({ q: "", page: 1 });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-56 flex-1">
        <Label className="sr-only" htmlFor="library-search">
          Chercher dans ma bibliothèque
        </Label>

        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>

          <Input
            autoComplete="off"
            defaultValue={filters.q}
            id="library-search"
            onChange={(event) =>
              setFilters(
                { q: event.target.value, page: 1 },
                /**
                 * Trois cents millisecondes et non les quatre cents du catalogue : cette recherche
                 * ne quitte pas la base (`libraryWhere`), donc elle ne dépense rien du quota
                 * AniList. Le délai n'est là que pour ne pas empiler des rendus serveur.
                 */
                { limitUrlUpdates: debounce(300) },
              )
            }
            placeholder="Chercher dans ma bibliothèque…"
            ref={inputRef}
            type="search"
          />

          {filters.q ? (
            <InputGroupAddon align="inline-end">
              <Button
                aria-label="Effacer la recherche"
                className="size-6"
                onClick={clear}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

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

      {/*
        La disposition ne remet **pas** `page` à 1, contrairement à tout le reste de cette barre :
        elle ne change ni le nombre de résultats ni leur ordre. Renvoyer à la page 1 ferait perdre
        sa place à quelqu'un qui veut seulement voir la même page autrement.
      */}
      <ViewToggle
        onChange={(view) => setFilters({ view })}
        value={filters.view}
      />
    </div>
  );
}
