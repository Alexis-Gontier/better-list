"use client";

import { Children } from "react";

import { SectionHeading } from "@/app/(app)/(home)/_components/section-heading";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

/**
 * Une rangée de l'accueil : un titre-lien et un carrousel.
 *
 * **Seul le carrousel est client** : les cartes arrivent déjà rendues par le serveur, en enfants.
 * Les flèches sont dans l'en-tête et non sur les bords — posées de part et d'autre de la rangée,
 * elles sortaient du conteneur et chevauchaient la marge sous `lg`.
 *
 * **Les cartes reprennent les paliers de `CatalogueGrid`** — trois colonnes, puis sept dès `lg`, et
 * la même gouttière `gap-x-3` (d'où `-ml-3` / `pl-3` au lieu des `4` par défaut du carrousel). Une
 * `MediaCard` a ainsi exactement la même largeur sur l'accueil que sur `/search` et `/library`.
 *
 * **Il y avait un second gabarit, `wide`, pour des cartes en largeur** : il n'avait qu'un appelant,
 * la rangée « Mes listes », et il est parti avec elle le 17 septembre 2026. Une variante de mise en
 * page que plus rien ne rend est une branche qu'on garde à jour sans jamais la voir.
 */
const ITEM_CLASS = "basis-1/3 pl-3 lg:basis-1/7";

/**
 * Les flèches d'une rangée, **au style d'un bouton icône `outline` ordinaire**.
 *
 * `CarouselPrevious` et `CarouselNext` sont déjà en `outline`, mais le composant shadcn les pose en
 * absolu sur les bords et les arrondit en cercle (`rounded-full`). Dans l'en-tête, on les remet dans
 * le flux (`static inset-auto my-0`), à la taille `icon` et à l'arrondi `rounded-md` — la même forme
 * que les boutons ± du suivi (`StepButton`), plutôt qu'une forme propre au carrousel.
 */
const RAIL_ARROW_PROPS = {
  size: "icon",
  variant: "outline",
  className: "static inset-auto my-0 rounded-md",
} as const;

export function HomeRail({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <Carousel
      aria-label={title}
      className="flex flex-col gap-4"
      opts={{ align: "start", slidesToScroll: "auto" }}
    >
      <div className="flex items-center justify-between gap-3">
        <SectionHeading href={href} title={title} />

        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <CarouselPrevious {...RAIL_ARROW_PROPS} />
          <CarouselNext {...RAIL_ARROW_PROPS} />
        </div>
      </div>

      <CarouselContent className="-ml-3">
        {Children.map(children, (child) => (
          <CarouselItem className={ITEM_CLASS}>{child}</CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
