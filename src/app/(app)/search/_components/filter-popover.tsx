"use client";

import { CheckIcon, FilterIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

/**
 * Chip de filtre : un bouton à entonnoir qui ouvre une liste sélectionnable.
 *
 * Un seul composant pour les quatre filtres, en mono comme en multi-sélection. La recherche
 * interne n'apparaît qu'au-delà d'un certain nombre d'options — inutile sur cinq statuts,
 * indispensable sur les cinq cents tags d'AniList.
 */
export function FilterPopover({
  label,
  options,
  selected,
  onChange,
  multiple = false,
  searchThreshold = 12,
}: {
  label: string;
  options: FilterOption[];
  /** Toujours un tableau, même en mono-sélection : ça évite deux formes d'API. */
  selected: string[];
  onChange: (values: string[]) => void;
  multiple?: boolean;
  searchThreshold?: number;
}) {
  const hasSelection = selected.length > 0;
  const showSearch = options.length > searchThreshold;

  function toggle(value: string) {
    if (!multiple) {
      // En mono-sélection, recliquer la valeur active la retire — sinon il n'y aurait aucun moyen
      // de revenir à « tout » sans passer par la réinitialisation générale.
      onChange(selected.includes(value) ? [] : [value]);
      return;
    }

    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  /** En mono-sélection, on affiche le libellé choisi ; en multi, un compteur. */
  const summary = !hasSelection
    ? null
    : multiple
      ? String(selected.length)
      : (options.find((option) => option.value === selected[0])?.label ??
        selected[0]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className={cn(hasSelection && "border-primary/40")}
          size="sm"
          type="button"
          variant="outline"
        >
          <FilterIcon
            aria-hidden="true"
            className={cn(
              "text-muted-foreground",
              hasSelection && "text-foreground",
            )}
          />
          {label}
          {summary ? (
            <Badge className="ml-0.5" variant="secondary">
              {summary}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          {showSearch ? (
            <CommandInput placeholder={`Filtrer ${label.toLowerCase()}…`} />
          ) : null}

          <CommandList>
            <CommandEmpty>Aucune option.</CommandEmpty>

            {options.map((option) => {
              const isSelected = selected.includes(option.value);

              return (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggle(option.value)}
                  value={option.label}
                >
                  <CheckIcon
                    aria-hidden="true"
                    className={cn("opacity-0", isSelected && "opacity-100")}
                  />
                  {option.label}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
