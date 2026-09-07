import Link from "next/link";

import { routes } from "@/config/routes";
import {
  LIBRARY_TYPE_OPTIONS,
  serializeTierFilters,
  type TierFilterValues,
} from "@/features/tracking/lib/library-params";
import { cn } from "@/lib/utils";

/**
 * La coupe du plateau : tout, les animes, les mangas.
 *
 * **Comparer un manga à un anime ne pose pas la même question** que comparer deux animes entre eux,
 * et c'est la seule coupe que cet écran doit savoir faire — ni statut, ni terme, ni tri : les
 * paliers *sont* le tri, et une bibliothèque qu'on recale se regarde en entier.
 *
 * **Des liens, pas des boutons**, comme la rangée de statuts de `/library` : chacun est une adresse
 * qu'on peut mettre en favori, et un bouton qui écrirait la même chose en JavaScript coûterait un
 * îlot client pour ce que le navigateur fait déjà. Composant serveur.
 */
export function TierTypeRow({ filters }: { filters: TierFilterValues }) {
  const hrefFor = (type: TierFilterValues["type"]) =>
    serializeTierFilters(routes.library.tiers, { type });

  return (
    <nav aria-label="Filtrer le plateau par type d'œuvre">
      <ul className="flex flex-wrap items-center gap-2">
        <TypeLink
          current={filters.type === null}
          href={hrefFor(null)}
          label="Tout"
        />

        {LIBRARY_TYPE_OPTIONS.map((option) => (
          <TypeLink
            current={filters.type === option.value}
            href={hrefFor(option.value)}
            key={option.value}
            label={option.label}
          />
        ))}
      </ul>
    </nav>
  );
}

function TypeLink({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <li>
      <Link
        /*
          L'onglet actif est **inversé** et non teinté : sur Obsidienne, `bg-muted` posé sur un fond
          de carte est indiscernable — c'est la mesure faite sur la rangée de statuts, et elle vaut
          ici aussi.
        */
        aria-current={current ? "page" : undefined}
        className={cn(
          "inline-flex h-8 items-center rounded-md border px-3 text-sm transition-colors",
          current
            ? "on-inverted-surface border-foreground bg-foreground text-background"
            : "border-border bg-card hover:border-foreground/30 hover:bg-muted",
        )}
        href={href}
      >
        {label}
      </Link>
    </li>
  );
}
