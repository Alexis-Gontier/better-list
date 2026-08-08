import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Pagination en liens, pas en boutons.
 *
 * Des `<Link>` restent navigables au clic milieu, préchargés par Next, et fonctionnent avant
 * l'hydratation — ce qu'un `onClick` client ne fait pas. La pagination n'a besoin d'aucun état.
 *
 * **`hrefForPage` est une fonction, et l'appelant la fournit.** Ce composant ne connaît ni les
 * filtres de la recherche ni ceux de la bibliothèque : chacun sérialise son URL avec les parseurs
 * qui la reliront. Assembler l'adresse ici obligerait à y importer les deux jeux de filtres, et
 * casserait au premier changement de sérialisation.
 *
 * Il a démarré dans le `_components/` de la recherche ; la bibliothèque en a eu besoin, donc il est
 * monté ici (règle de promotion, docs/ARCHITECTURE.md). Il ne connaît aucune entité métier, d'où
 * `shared/` et non `features/`.
 */
export function Pagination({
  currentPage,
  lastPage,
  hasNextPage = currentPage < lastPage,
  hrefForPage,
  label = "Pagination des résultats",
}: {
  currentPage: number;
  lastPage: number;
  /** Quand la source la connaît mieux que le calcul : AniList plafonne ses totaux. */
  hasNextPage?: boolean;
  hrefForPage: (page: number) => string;
  label?: string;
}) {
  if (lastPage <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-4 pt-2"
    >
      {currentPage > 1 ? (
        <Button asChild size="sm" variant="outline">
          <Link href={hrefForPage(currentPage - 1)} rel="prev">
            <ChevronLeftIcon aria-hidden="true" />
            Précédent
          </Link>
        </Button>
      ) : (
        <span />
      )}

      <p aria-live="polite" className="text-muted-foreground text-sm">
        Page {currentPage} sur {lastPage}
      </p>

      {hasNextPage ? (
        <Button asChild size="sm" variant="outline">
          <Link href={hrefForPage(currentPage + 1)} rel="next">
            Suivant
            <ChevronRightIcon aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
