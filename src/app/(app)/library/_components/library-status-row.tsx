import Link from "next/link";

import { routes } from "@/config/routes";
import { EntryStatusDot } from "@/features/tracking/components/entry-status-dot";
import {
  LIBRARY_STATUS_OPTIONS,
  type LibraryFilterValues,
  serializeLibraryFilters,
} from "@/features/tracking/lib/library-params";
import type { EntryStatus } from "@/features/tracking/schemas/tracking.schema";
import type { LibraryStatusCounts } from "@/features/tracking/server/library.queries";
import { cn } from "@/lib/utils";

/**
 * La rangée de statuts — **la tête de `/library`, et ce qui la distingue de `/search`.**
 *
 * Le catalogue se parcourt par ce qu'on cherche ; une bibliothèque se parcourt par où on en est.
 * Le statut n'est donc pas une facette parmi d'autres, cachée dans un panneau : c'est l'axe de
 * l'écran, et il est le premier à l'œil.
 *
 * **Des liens, pas des boutons.** Chacun est une adresse qu'on peut s'envoyer ou mettre en
 * favori, et l'URL est le contrat (`library-params.ts`). Un bouton qui écrirait la même chose en
 * JavaScript coûterait un îlot client pour un comportement que le navigateur fait déjà — et
 * perdrait l'ouverture dans un nouvel onglet.
 *
 * Composant **serveur** : rien n'y est interactif au sens de React.
 */

/**
 * Le compteur est **à côté** du libellé, pas dessous ni entre parenthèses.
 *
 * C'est ce qui permet de lire la rangée comme une répartition — « j'ai abandonné presque autant que
 * j'ai terminé » se voit sans compter. Les parenthèses, elles, se lisent comme une précision
 * accessoire.
 */
type LibraryStatusRowProps = {
  counts: LibraryStatusCounts;
  /** Les filtres courants : un changement de statut ne doit rien emporter d'autre. */
  filters: LibraryFilterValues;
};

export function LibraryStatusRow({ counts, filters }: LibraryStatusRowProps) {
  /**
   * Le lien d'un statut, filtres courants conservés et **retour à la première page**.
   *
   * Sans cette remise à zéro, passer de « Terminé » (159 lignes, huit pages) à « Prévu » (16, une
   * page) depuis la page 5 atterrit sur une page vide. C'est la même règle que dans la barre, et
   * elle est ici aussi parce que ces liens ne passent pas par elle.
   */
  const hrefFor = (status: LibraryFilterValues["status"]) =>
    serializeLibraryFilters(routes.library, { ...filters, status, page: 1 });

  return (
    /*
      `flex-wrap` et non un défilement horizontal : sept intitulés ne tiennent pas sur 390 px, et
      une rangée qui déborde cache ses derniers éléments sans le dire. Repliée sur deux lignes, elle
      montre tout — et « Abandonné », qui est souvent le plus gros compte, n'est pas celui qu'on
      veut faire disparaître hors de l'écran.
    */
    <nav aria-label="Filtrer par statut de suivi">
      <ul className="flex flex-wrap items-center gap-2">
        <StatusLink
          count={counts.total}
          current={filters.status === null}
          href={hrefFor(null)}
          label="Tout"
        />

        {/*
          `LIBRARY_STATUS_OPTIONS` plutôt que l'ordre et la table de libellés recomposés ici : le
          couple valeur/libellé est déjà écrit au contrat, et c'est lui qui décide de ce que
          l'écran propose. Le refaire à la main donnerait deux listes à tenir alignées.
        */}
        {LIBRARY_STATUS_OPTIONS.map((option) => (
          <StatusLink
            count={counts.byStatus[option.value]}
            current={filters.status === option.value}
            href={hrefFor(option.value)}
            key={option.value}
            label={option.label}
            status={option.value}
          />
        ))}
      </ul>
    </nav>
  );
}

function StatusLink({
  href,
  label,
  count,
  current,
  status,
}: {
  href: string;
  label: string;
  count: number;
  current: boolean;
  /**
   * Absent pour « Tout », et c'est voulu : ce n'est pas un statut, c'est leur absence. Lui inventer
   * une septième couleur en ferait un pair des six, alors qu'il les contient.
   */
  status?: EntryStatus;
}) {
  return (
    <li>
      <Link
        /*
          **L'onglet actif est inversé**, comme les puces du panneau de `/search`, et pour la même
          raison mesurée à l'écran : sur Obsidienne, `bg-muted` sur un fond de carte est
          rigoureusement indiscernable. Il faut un renversement de valeur, pas une nuance — et pas
          l'accent, que la spec du 2 septembre réserve.
        */
        aria-current={current ? "page" : undefined}
        className={cn(
          "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
          current
            ? // `on-inverted-surface` rend aux pastilles leurs valeurs de thème clair : sur ce
              // fond presque blanc, une teinte calibrée pour Obsidienne se délave (globals.css).
              "on-inverted-surface border-foreground bg-foreground text-background"
            : "border-border bg-card hover:border-foreground/30 hover:bg-muted",
        )}
        href={href}
      >
        {/*
          La pastille est **décorative ici** : le libellé est juste à côté. C'est sur la carte, où
          elle est seule, qu'elle porte son nom.
        */}
        {status ? <EntryStatusDot labelled status={status} /> : null}
        {label}
        {/*
          `tabular-nums` pour que les compteurs ne fassent pas danser les intitulés d'une largeur de
          chiffre à l'autre quand ils changent — et un statut vide garde son onglet, avec son zéro :
          « Relecture · 0 » se lit, un onglet qui manque se cherche.
        */}
        <span
          className={cn(
            "tabular-nums",
            current ? "text-background/60" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}
