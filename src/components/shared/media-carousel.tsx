"use client";

import type { ReactNode } from "react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * La rangée défilante du catalogue, et son squelette.
 *
 * Elle répond à un défaut de l'accueil : les cinq sections de découverte y étaient rendues en
 * `MediaGrid`, soit soixante vignettes en grilles pleines. Sur six colonnes, chaque section faisait
 * deux rangées ; sur mobile, où la grille tombe à deux colonnes, elle en faisait six — et l'accueil
 * demandait une quarantaine de rangées de défilement avant d'atteindre le journal. Or ces
 * cinq sections ne sont **pas** des grilles de résultats : ce sont des rangées éditoriales, dont on
 * regarde le début et qu'on parcourt si le sujet accroche. Une rangée qui défile dit exactement
 * cela, là où une grille pleine réclame la page entière pour la même promesse.
 *
 * `MediaGrid` reste en place partout ailleurs — recherche, bibliothèque, liste, tableau de bord —
 * parce qu'on y cherche **une** œuvre dans un ensemble, et qu'un ensemble qu'on fouille doit se
 * voir en entier.
 *
 * **Les vignettes arrivent en `children`, déjà rendues par le serveur.** C'est la règle de
 * `docs/ARCHITECTURE.md` — passer les Server Components en `children` plutôt que convertir le
 * sous-arbre — et ici ce n'est pas une préférence : `MediaCard` est `async`, elle lit elle-même la
 * langue des titres. La rendre depuis un composant client la casserait net. Seule la mécanique de
 * défilement descend au client.
 */

/**
 * **Chaque palier montre les colonnes de `MediaGrid`, plus une demie.**
 *
 * Le nombre est calculé, pas choisi : `100 / (n + 0.5)` pour les mêmes `n` que la grille (2, 3, 4,
 * 6). La demi-vignette est ce qui rend le défilement visible sans rien écrire — une rangée coupée
 * net au bord se lit comme une rangée qui s'arrête là, et les flèches ne sont qu'un second recours
 * (elles n'existent pas au doigt, où le geste est le balayage).
 *
 * Les paliers suivent ceux de la grille pour que les deux dispositions se ressemblent d'une section
 * à l'autre de la même page : l'accueil montre les deux à quelques centaines de pixels d'écart.
 */
const ITEM_BASIS =
  "basis-[40%] sm:basis-[28.571%] md:basis-[22.222%] lg:basis-[15.384%]";

/**
 * La gouttière est celle de `MediaGrid` (`gap-x-3`, 12 px), et non les 16 px que shadcn pose par
 * défaut : les deux dispositions se côtoient sur l'accueil, et un écart différent d'une section à
 * l'autre se voit.
 */
const GUTTER = { content: "-ml-3", item: "pl-3" } as const;

export function MediaCarousel({
  label,
  children,
}: {
  /**
   * Le titre de la rangée, pour nommer la région.
   *
   * `role="region"` sans nom accessible est une région qu'on ne peut pas distinguer d'une autre :
   * cinq rangées anonymes sur l'accueil ne se navigueraient pas. Avec le nom, elles deviennent des
   * points de saut — « Tendances », « Cette saison ».
   */
  label: string;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <Carousel
      /*
        `aria-roledescription` est **lu tel quel** par un lecteur d'écran, donc il doit être dans la
        langue de la page. Le composant généré écrit « carousel » ; sur une interface `lang="fr"`,
        c'est le même défaut que le `lang="en"` corrigé le 11 août, en plus discret.
      */
      aria-label={label}
      aria-roledescription="carrousel"
      opts={{
        // `start` et non le centrage par défaut d'Embla : une rangée d'affiches se lit de gauche à
        // droite, et une première vignette centrée laisserait un vide à gauche au repos.
        align: "start",
        // Sans lui, Embla ménage du vide en fin de course pour honorer le dernier point d'ancrage.
        containScroll: "trimSnaps",
        // Zéro coupe l'animation d'Embla, que `motion-reduce` ne peut pas atteindre : elle est
        // pilotée en JavaScript, pas en CSS.
        duration: reducedMotion ? 0 : undefined,
        // Une flèche fait avancer d'une pleine largeur de rangée, pas d'une vignette : c'est le
        // geste qu'on refait pour parcourir, et le répéter six fois par section serait une corvée.
        slidesToScroll: "auto",
      }}
    >
      <CarouselContent className={GUTTER.content}>{children}</CarouselContent>

      {/*
        **Les flèches sont ramenées à l'intérieur de la rangée.** Le composant généré les pose à
        `-left-12`, soit 48 px hors de sa boîte : sous un `main` plafonné à `max-w-6xl`, elles
        tombaient dans la marge de la page, et l'`overflow-x-clip` du layout les aurait rognées.

        Centrées verticalement sur la vignette entière, elles retombent dans le tiers bas de
        l'affiche — le titre et la ligne de contexte descendent le centre sous le bas de l'image
        sans jamais l'atteindre. Pas de calcul en pourcentage, donc, qui casserait le jour où la
        carte gagne une ligne.

        Masquées sous `sm` : au doigt, le balayage fait le travail, et deux cibles posées sur la
        première et la dernière jaquette y prendraient la place du « +1 » sans rien apporter.

        **Fond opaque, et c'est une correction faite à l'écran.** Le `variant="outline"` du composant
        généré peint son fond à 30 % : mesuré sur l'accueil, la jaquette traversait le bouton au
        point qu'une lettre de l'affiche se lisait à l'intérieur, et le chevron se perdait dessus.
        C'est la règle déjà écrite sur la pastille « 18+ » de `MediaCard` — le contraste d'un
        contrôle posé sur une image quelconque n'est garanti par rien — et le même remède que le
        bouton de fermeture d'`EntryDialog`, qui est lui aussi posé sur une bannière.

        Le doublon `dark:` n'est pas une redondance : la variante `outline` du bouton peint
        `dark:bg-input/30`, et un `dark:` l'emporte sur une classe de base quoi qu'en dise l'ordre
        d'écriture. Sans lui la correction ne tenait qu'en thème clair — et c'est en sombre qu'elle
        a été trouvée.

        L'`aria-label` nomme la rangée parce qu'il y en a cinq sur la page : « voir les œuvres
        suivantes », répété cinq fois dans une liste de liens, ne dirait pas de quoi.
      */}
      <CarouselPrevious
        aria-label={`${label} : voir les œuvres précédentes`}
        className="left-1 hidden bg-background/90 backdrop-blur-xs hover:bg-background sm:inline-flex dark:bg-background/90 dark:hover:bg-background"
      />
      <CarouselNext
        aria-label={`${label} : voir les œuvres suivantes`}
        className="right-1 hidden bg-background/90 backdrop-blur-xs hover:bg-background sm:inline-flex dark:bg-background/90 dark:hover:bg-background"
      />
    </Carousel>
  );
}

/**
 * Une vignette de la rangée.
 *
 * Elle existe pour que `ITEM_BASIS` ne soit écrit qu'une fois : recopié chez chaque appelant, il
 * finirait par diverger d'une section à l'autre, et deux rangées de largeurs différentes sur la
 * même page se lisent comme un défaut d'affichage. C'est le raisonnement de `MediaGrid`, où les
 * paliers de colonnes vivent aussi dans une seule constante.
 */
export function MediaCarouselItem({ children }: { children: ReactNode }) {
  return (
    <CarouselItem className={`${ITEM_BASIS} ${GUTTER.item}`}>
      {children}
    </CarouselItem>
  );
}

/**
 * Le squelette, dans le **même fichier** que la rangée qu'il remplace — pour la raison qui vaut
 * déjà pour `MediaGrid` : c'est la seule façon de garantir qu'ils ne divergent pas. Un squelette
 * resté sur les largeurs de l'ancienne grille décalerait toute la page à la fin du chargement,
 * c'est-à-dire ferait exactement ce qu'un squelette est là pour éviter.
 *
 * Pas de flèches : elles ne commandent rien tant qu'il n'y a rien à faire défiler.
 */
export function MediaCarouselSkeleton({ count }: { count: number }) {
  return (
    <div className="overflow-hidden">
      <div className={`flex ${GUTTER.content}`}>
        {Array.from({ length: count }, (_, index) => index).map((index) => (
          <div
            className={`min-w-0 shrink-0 grow-0 ${ITEM_BASIS} ${GUTTER.item}`}
            key={index}
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="aspect-2/3 w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
