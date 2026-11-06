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
 * **`wide` porte des cartes de liste** (« Listes de la communauté », D66), **à largeur fixe** comme
 * sur la maquette : 300 px sur téléphone, 340 dès `sm`, gouttière `gap-4`. La carte suivante dépasse
 * toujours du bord — c'est elle qui dit qu'on peut faire glisser.
 */
const ITEM_CLASS = {
  covers: "basis-1/3 pl-3 lg:basis-1/7",
  wide: "basis-[316px] pl-4 sm:basis-[356px]",
} as const;

const CONTENT_CLASS = { covers: "-ml-3", wide: "-ml-4" } as const;

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
  layout = "covers",
  children,
}: {
  title: string;
  href?: string;
  layout?: keyof typeof ITEM_CLASS;
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

      <CarouselContent className={CONTENT_CLASS[layout]}>
        {Children.map(children, (child) => (
          <CarouselItem className={ITEM_CLASS[layout]}>{child}</CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
