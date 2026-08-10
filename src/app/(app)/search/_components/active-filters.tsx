"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSearchFilters } from "@/features/media/hooks/use-search-filters";
import {
  STATUS_OPTIONS,
  TYPE_OPTIONS,
} from "@/features/media/lib/search-params";

/**
 * Les filtres actifs, en puces retirables sous la barre de recherche.
 *
 * Ils répondent à un défaut précis de la barre : `FilterPopover` range genres et tags derrière un
 * bouton qui ne change pas d'aspect selon ce qu'il contient. Trois genres cochés il y a deux
 * minutes deviennent alors une explication invisible d'un résultat qu'on ne comprend plus — et le
 * seul remède était un bouton « réinitialiser » qui emporte tout, y compris ce qu'on voulait
 * garder.
 *
 * Chaque puce **retire exactement un critère**, ce que le bouton de réinitialisation ne sait pas
 * faire. Elles ne remplacent donc pas les popovers, elles rendent leur contenu lisible et
 * défaisable un par un.
 *
 * **Le terme de recherche n'y figure pas**, et c'est le corollaire du raisonnement ci-dessus : il
 * est déjà écrit en toutes lettres dans le champ, à quelques pixels de là. Une puce ne lui
 * apporterait aucune visibilité, et son bouton de retrait devrait vider un `<input>` non contrôlé
 * qui vit dans un autre composant — un couplage payé pour un doublon.
 */

/** Un critère affiché : ce qu'on lit, et ce que « retirer » veut dire pour lui. */
type Chip = { key: string; label: string; remove: () => void };

export function ActiveFilters() {
  const [filters, setFilters] = useSearchFilters();

  const chips: Chip[] = [];

  if (filters.type) {
    chips.push({
      key: `type:${filters.type}`,
      label:
        TYPE_OPTIONS.find((option) => option.value === filters.type)?.label ??
        filters.type,
      remove: () => setFilters({ type: null, page: 1 }),
    });
  }

  if (filters.status) {
    chips.push({
      key: `status:${filters.status}`,
      label:
        STATUS_OPTIONS.find((option) => option.value === filters.status)
          ?.label ?? filters.status,
      remove: () => setFilters({ status: null, page: 1 }),
    });
  }

  for (const genre of filters.genre) {
    chips.push({
      key: `genre:${genre}`,
      label: genre,
      remove: () =>
        setFilters({
          genre: filters.genre.filter((value) => value !== genre),
          page: 1,
        }),
    });
  }

  for (const tag of filters.tag) {
    chips.push({
      key: `tag:${tag}`,
      label: tag,
      remove: () =>
        setFilters({
          tag: filters.tag.filter((value) => value !== tag),
          page: 1,
        }),
    });
  }

  // Rien d'actif : la rangée disparaît au lieu de laisser un vide au-dessus des résultats. Le tri
  // n'y figure pas — il ordonne, il ne retranche pas, et il a toujours une valeur.
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-muted-foreground text-xs">Filtres :</span>

      {chips.map((chip) => (
        <button
          /*
            Un vrai `<button>` par puce, et l'étiquette dit ce que le clic fait — pas ce que la
            puce contient. « Action » lu seul laisserait croire à un filtre à appliquer, alors que
            le geste le retire.
          */
          aria-label={`Retirer le filtre ${chip.label}`}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-secondary py-0.5 pr-1.5 pl-2.5 font-medium text-secondary-foreground text-xs transition-colors hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          key={chip.key}
          onClick={chip.remove}
          type="button"
        >
          {chip.label}
          <XIcon aria-hidden="true" className="size-3 opacity-60" />
        </button>
      ))}

      {/*
        Le raccourci n'apparaît qu'à partir de deux critères : à un seul, il ferait exactement ce
        que la puce voisine fait déjà.

        Il ne vide que les critères affichés ici — ni le terme de recherche, ni le tri. « Tout
        effacer » posé sous une rangée de puces promet de retirer ces puces-là ; emporter au passage
        la requête tapée serait une surprise, et c'est déjà ce que fait le bouton de
        réinitialisation de la barre, qui, lui, est nommé pour ça.
      */}
      {chips.length > 1 ? (
        <Button
          className="h-6 px-2 text-xs"
          onClick={() =>
            setFilters({
              type: null,
              status: null,
              genre: [],
              tag: [],
              page: 1,
            })
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          Tout effacer
        </Button>
      ) : null}
    </div>
  );
}
