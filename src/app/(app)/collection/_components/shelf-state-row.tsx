import Link from "next/link";
import { routes } from "@/config/routes";
import {
  COLLECTION_STATE_OPTIONS,
  type CollectionFilterValues,
  type CollectionState,
  serializeCollectionFilters,
} from "@/features/collection/lib/collection-params";
import { cn } from "@/lib/utils";

/**
 * La rangée d'états — « Toutes », « Incomplètes », « Complètes », avec leurs comptes.
 *
 * C'est la même grammaire que la rangée de statuts de `/library` : l'axe de l'écran est en toutes
 * lettres au-dessus de la liste, pas replié dans un sélecteur. L'axe, ici, n'est pas où j'en suis
 * dans ma lecture mais ce qu'il me reste à acheter.
 *
 * **Des liens, pas des boutons.** `/collection?state=incomplete` est une adresse qu'on met en
 * favori — c'est précisément celle qu'on ouvre en librairie, et un bouton en JavaScript coûterait
 * un îlot client pour ce que le navigateur fait déjà.
 *
 * Composant **serveur**.
 */
export function ShelfStateRow({
  counts,
  filters,
}: {
  counts: Record<CollectionState, number>;
  /** Le filtre courant : on le repasse au sérialiseur pour n'emporter que ce qui change. */
  filters: CollectionFilterValues;
}) {
  return (
    <nav aria-label="Filtrer les séries de l'étagère">
      <ul className="flex flex-wrap items-center gap-2">
        {COLLECTION_STATE_OPTIONS.map((option) => (
          <li key={option.value}>
            <Link
              /*
                L'onglet actif est **inversé**, comme sur `/library` : sur Obsidienne, un `bg-muted`
                posé sur un fond de carte est indiscernable. Il faut un renversement de valeur.
              */
              aria-current={filters.state === option.value ? "page" : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                filters.state === option.value
                  ? "on-inverted-surface border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:border-foreground/30 hover:bg-muted",
              )}
              href={serializeCollectionFilters(routes.collection.root, {
                state: option.value,
              })}
            >
              {option.label}
              {/*
                `tabular-nums` pour que les intitulés ne dansent pas d'une largeur de chiffre à
                l'autre. Un état vide garde son onglet et son zéro : « Complètes · 0 » se lit,
                un onglet qui manque se cherche.
              */}
              <span
                className={cn(
                  "tabular-nums",
                  filters.state === option.value
                    ? "text-background/60"
                    : "text-muted-foreground",
                )}
              >
                {counts[option.value]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
