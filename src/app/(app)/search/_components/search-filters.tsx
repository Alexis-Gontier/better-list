"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { debounce } from "nuqs";
import { useRef } from "react";

import { FilterPopover } from "@/app/(app)/search/_components/filter-popover";
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
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSearchFilters } from "@/features/media/hooks/use-search-filters";
import {
  EMPTY_FILTERS,
  resolveSort,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "@/features/media/lib/search-params";
import {
  type SortField,
  sortFieldHasDirection,
} from "@/features/media/schemas/search-media.schema";

/**
 * Barre de filtres de la recherche. Seul îlot client de la page.
 *
 * Chaque changement remet `page` à 1. Sans ça, filtrer depuis la page 7 laisse `page=7` dans
 * l'URL, la nouvelle recherche renvoie moins de résultats, et l'utilisateur voit une page vide en
 * croyant que rien ne correspond.
 */
export function SearchFilters({
  genres,
  tags,
}: {
  genres: string[];
  tags: string[];
}) {
  const [filters, setFilters] = useSearchFilters();

  /**
   * Le champ est **non contrôlé** — `defaultValue` et non `value` — parce que l'écriture dans l'URL
   * est anti-rebondie : un champ piloté par `filters.q` reviendrait à la valeur d'il y a 400 ms à
   * chaque frappe, et le curseur sauterait en fin de champ.
   *
   * La contrepartie est que React ne peut pas le vider : sans cette `ref`, réinitialiser les
   * filtres remettait bien `q` à vide dans l'URL et dans les résultats, mais laissait le terme
   * affiché dans le champ — une barre qui décrit une recherche qui n'a plus lieu.
   */
  const inputRef = useRef<HTMLInputElement>(null);

  function clearQuery() {
    if (inputRef.current) inputRef.current.value = "";
  }

  /**
   * Le tri **effectif**, pas celui de l'URL : sans terme de recherche, la grille sert les tendances
   * (voir `resolveSort`). Afficher `filters.sort` mettrait « Pertinence » au-dessus de résultats qui
   * n'en sont pas, et le seul contrôle censé expliquer l'ordre de la page mentirait.
   *
   * L'option elle-même disparaît alors de la liste, plutôt que d'être désactivée : « Pertinence »
   * n'est pas une option indisponible, c'est une question qui n'a pas encore d'objet.
   */
  const sort = resolveSort(filters);
  const sortOptions = filters.q.trim()
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((option) => option.value !== "SEARCH_MATCH");

  const directionEnabled = sortFieldHasDirection(sort);
  const isPristine =
    !filters.q &&
    !filters.type &&
    !filters.status &&
    filters.genre.length === 0 &&
    filters.tag.length === 0 &&
    filters.sort === EMPTY_FILTERS.sort &&
    filters.dir === EMPTY_FILTERS.dir;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-56 flex-1">
        <Label className="sr-only" htmlFor="recherche">
          Rechercher une œuvre
        </Label>

        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>

          <Input
            autoComplete="off"
            defaultValue={filters.q}
            id="recherche"
            onChange={(event) =>
              setFilters(
                { q: event.target.value, page: 1 },
                /**
                 * Sans limite, chaque frappe pousserait une entrée d'historique et une requête
                 * AniList — dont le quota est de 30/minute, partagé par tous les visiteurs.
                 */
                { limitUrlUpdates: debounce(400) },
              )
            }
            placeholder="Rechercher…"
            ref={inputRef}
            type="search"
          />

          {filters.q ? (
            <InputGroupAddon align="inline-end">
              <Button
                aria-label="Effacer la recherche"
                className="size-6"
                onClick={() => {
                  clearQuery();
                  setFilters({ q: "", page: 1 });
                }}
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

      <FilterPopover
        label="Type"
        onChange={(values) => setFilters({ type: typeValue(values), page: 1 })}
        options={[...TYPE_OPTIONS]}
        selected={filters.type ? [filters.type] : []}
      />

      <FilterPopover
        label="Statut"
        onChange={(values) =>
          setFilters({ status: statusValue(values), page: 1 })
        }
        options={[...STATUS_OPTIONS]}
        selected={filters.status ? [filters.status] : []}
      />

      <FilterPopover
        label="Genres"
        multiple
        onChange={(values) => setFilters({ genre: values, page: 1 })}
        options={genres.map((genre) => ({ value: genre, label: genre }))}
        selected={filters.genre}
      />

      <FilterPopover
        label="Tags"
        multiple
        onChange={(values) => setFilters({ tag: values, page: 1 })}
        options={tags.map((tag) => ({ value: tag, label: tag }))}
        selected={filters.tag}
      />

      <Separator className="h-6" orientation="vertical" />

      <div className="flex items-center gap-1.5">
        <Label className="text-muted-foreground text-sm" htmlFor="tri">
          Tri&nbsp;:
        </Label>

        <Select
          onValueChange={(value) =>
            setFilters({ sort: value as SortField, page: 1 })
          }
          value={sort}
        >
          <SelectTrigger className="w-40" id="tri" size="sm">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/*
          La direction n'a pas de sens pour « Pertinence » : AniList n'a pas de pendant ascendant à
          `SEARCH_MATCH`, et « les moins pertinents d'abord » ne veut rien dire. On désactive plutôt
          que de masquer, pour que la barre ne change pas de largeur en changeant de tri.
        */}
        {(["ASC", "DESC"] as const).map((direction) => (
          <Button
            aria-label={
              direction === "ASC" ? "Ordre croissant" : "Ordre décroissant"
            }
            aria-pressed={filters.dir === direction}
            disabled={!directionEnabled}
            key={direction}
            onClick={() => setFilters({ dir: direction, page: 1 })}
            size="icon-sm"
            type="button"
            variant={
              filters.dir === direction && directionEnabled
                ? "secondary"
                : "ghost"
            }
          >
            {direction === "ASC" ? <ArrowUpIcon /> : <ArrowDownIcon />}
          </Button>
        ))}
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Réinitialiser les filtres"
            disabled={isPristine}
            onClick={() => {
              clearQuery();
              setFilters(EMPTY_FILTERS);
            }}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <RotateCcwIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Réinitialiser les filtres</TooltipContent>
      </Tooltip>

      {/*
        La disposition ne remet **pas** `page` à 1 : elle ne change ni le nombre de résultats ni
        leur ordre, et renvoyer à la page 1 ferait perdre sa place à quelqu'un qui veut seulement
        voir la même page autrement. C'est aussi pour ça qu'elle est hors du groupe de tri et après
        la réinitialisation — elle ne filtre rien.
      */}
      <ViewToggle
        onChange={(view) => setFilters({ view })}
        value={filters.view}
      />
    </div>
  );
}

/**
 * `FilterPopover` parle en tableaux pour n'avoir qu'une seule API. Ces deux conversions ramènent
 * une sélection unique vers le type attendu par les parseurs d'URL.
 */
function typeValue(values: string[]) {
  const [value] = values;
  return (TYPE_OPTIONS.find((option) => option.value === value)?.value ??
    null) as (typeof TYPE_OPTIONS)[number]["value"] | null;
}

function statusValue(values: string[]) {
  const [value] = values;
  return (STATUS_OPTIONS.find((option) => option.value === value)?.value ??
    null) as (typeof STATUS_OPTIONS)[number]["value"] | null;
}
