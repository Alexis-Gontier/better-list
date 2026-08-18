"use client";

import Autoplay from "embla-carousel-autoplay";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  HERO_BOX,
  HERO_HEIGHT,
  HERO_PEEK,
  HERO_SLIDE_BOX,
} from "@/app/(app)/(home)/_lib/hero-geometry";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Le bandeau d'ouverture de l'accueil : une bannière pleine boîte par diapositive.
 *
 * **Ce n'est pas `MediaCarousel` avec d'autres classes**, et la différence n'est pas une question de
 * taille. Une rangée de découverte est une liste ouverte qu'on parcourt du coin de l'œil : elle
 * défile par pleines largeurs, s'aligne à gauche et n'a pas d'indicateur, parce que personne ne
 * cherche à savoir combien elle compte de vignettes. Ici les diapositives sont dénombrables et on
 * revient à la première : elles se centrent une par une, et il faut des points pour dire laquelle
 * est active. Les deux composants partagent Embla, le débordement des voisines — et rien d'autre.
 *
 * **Une diapositive n'occupe que 80 % de la boîte** (`HERO_PEEK`) : le dixième qui dépasse de chaque
 * côté est ce qui annonce qu'il y a une suite, et de quel côté. Une bannière coupée net aux deux
 * bords ne le disait qu'avec ses points, c'est-à-dire nulle part avant qu'on les regarde.
 *
 * **Les diapositives arrivent en `children`, déjà rendues par le serveur** — même règle que
 * `MediaCarousel`, et pour la même raison : leur contenu lit la langue des titres et l'échelle de
 * note, ce qu'un composant client ne peut pas faire. Seule la mécanique de défilement descend ici.
 */
export function HeroCarousel({
  label,
  count,
  children,
}: {
  /** Nomme la région : sans nom accessible, `role="region"` ne se distingue d'aucune autre. */
  label: string;
  /**
   * Combien de diapositives, pour dessiner les points **avant** qu'Embla ait mesuré quoi que ce
   * soit.
   *
   * Les lire depuis `api.scrollSnapList()` marcherait aussi, mais la rangée de points n'existerait
   * qu'après l'hydratation : elle apparaîtrait sous la bannière une fraction de seconde après le
   * reste. L'appelant connaît le nombre, il le dit.
   */
  count: number;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  /**
   * Le greffon de défilement automatique, **construit une seule fois**.
   *
   * Embla lit son tableau de greffons à l'initialisation : une instance recréée à chaque rendu le
   * ferait se réinitialiser au moindre changement d'état — c'est-à-dire à chaque changement de
   * diapositive, celui-là même que le greffon provoque. La boucle est silencieuse et le carrousel
   * paraît seulement « saccadé ».
   */
  const autoplay = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY,
      // Reprendre après une interaction serait reprendre la main sur quelqu'un qui vient de la
      // prendre : un clic sur une flèche ou un point dit « je regarde celle-ci ». Le défilement
      // s'arrête alors définitivement, et c'est la seule façon qu'il ne se batte pas avec l'usager.
      stopOnInteraction: true,
      // Survol et focus suspendent sans arrêter : lire un synopsis ne doit pas être interrompu, mais
      // s'éloigner ne doit pas figer le bandeau pour toujours.
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  );

  useEffect(() => {
    if (!api) return;

    const sync = () => setCurrent(api.selectedScrollSnap());

    sync();
    api.on("select", sync);
    api.on("reInit", sync);

    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  /**
   * `prefers-reduced-motion` arrête le défilement automatique **pour de bon**.
   *
   * Le réglage ne dit pas « anime plus vite » mais « ne bouge pas tout seul », et c'est exactement ce
   * qu'un carrousel qui avance sans qu'on le lui demande fait. Mettre la durée d'animation à zéro
   * (ce qu'on fait par ailleurs pour le geste manuel) ne suffirait pas : la diapositive changerait
   * quand même, d'un coup, ce qui est pire.
   *
   * Lu dans un effet parce que le serveur ne connaît pas les réglages du visiteur — d'où l'arrêt
   * plutôt que la non-création : le greffon existe déjà quand la valeur arrive.
   */
  useEffect(() => {
    if (reducedMotion) autoplay.current.stop();
  }, [reducedMotion]);

  return (
    <Carousel
      // `aria-roledescription` est lu tel quel par un lecteur d'écran : il doit être en français,
      // comme sur `MediaCarousel`.
      aria-label={label}
      aria-roledescription="carrousel"
      className={HERO_BOX}
      opts={{
        // `center` et non l'alignement à gauche des rangées : c'est lui qui partage en deux les 20 %
        // que la diapositive laisse libres, donc qui fait exister la bande de gauche. Aligné au
        // début, le bandeau montrerait un cinquième de la suivante et rien de la précédente.
        align: "center",
        // Le retour au début après la dernière évite le cul-de-sac d'une boîte qu'on ne peut plus
        // faire avancer — et il est de toute façon requis par le défilement automatique, qui
        // s'arrêterait net à la cinquième.
        loop: true,
        // Zéro coupe l'animation d'Embla, que `motion-reduce` ne peut pas atteindre : elle est
        // pilotée en JavaScript.
        duration: reducedMotion ? 0 : undefined,
      }}
      plugins={[autoplay.current]}
      setApi={setApi}
    >
      {/*
        `ml-0` annule le `-ml-4` du composant généré : la gouttière est portée par `gap`, et non par
        un remplissage décalé — voir `HERO_PEEK` pour la raison, qui tient au centrage.

        Avec une seule diapositive il n'y a ni voisine ni gouttière : elle reprend toute la boîte,
        faute de quoi le bandeau serait une bannière rétrécie à 80 % flottant entre deux vides.
      */}
      <CarouselContent
        className={cn("ml-0 h-full", count > 1 && HERO_PEEK.gutter)}
      >
        <HeroSlideContext value={{ current, count }}>
          {children}
        </HeroSlideContext>
      </CarouselContent>

      {/*
        **Les flèches sont les bandes de débordement elles-mêmes, pas des pastilles.**

        Une pastille ronde posée sur une bannière doit se peindre un fond opaque pour rester visible
        (c'est ce que fait `MediaCarousel`, où elle chevauche une jaquette) ; ici le dixième laissé
        par la diapositive active est déjà une cible pleine hauteur qui ne recouvre rien de ce qu'on
        lit. La commande et ce qu'elle amène occupent alors le même endroit : cliquer sur le morceau
        de la voisine, c'est aller la chercher.

        Masquées sous `md` : au doigt le balayage fait le travail, et le débordement suffit à
        l'annoncer.
      */}
      <HeroArrow
        disabled={count < 2}
        label={`${label} : diapositive précédente`}
        onClick={() => api?.scrollPrev()}
        side="left"
      />
      <HeroArrow
        disabled={count < 2}
        label={`${label} : diapositive suivante`}
        onClick={() => api?.scrollNext()}
        side="right"
      />

      {/*
        Les points, et ce sont de **vrais boutons** : ils disent où l'on est *et* permettent d'aller
        ailleurs. Des `<span>` décoratifs laisseraient un utilisateur au clavier sans autre moyen
        d'atteindre la quatrième diapositive que trois appuis sur la flèche.

        La pastille visible fait 8 px, mais le bouton en fait 44 : le rembourrage porte la zone
        tactile à la taille minimale recommandée sans épaissir le trait. Une cible de 8 px au doigt se
        rate une fois sur deux.

        En blanc et non en jeton de thème : ils sont posés sur le voile noir, qui ne change pas avec
        le thème.
      */}
      {count > 1 ? (
        <div className="-translate-x-1/2 absolute bottom-1 left-1/2 z-20 flex items-center gap-2">
          {Array.from({ length: count }, (_, index) => index).map((index) => (
            <button
              aria-current={index === current}
              aria-label={`Aller à la diapositive ${index + 1} sur ${count}`}
              className="group flex h-11 w-4 items-center justify-center"
              key={index}
              onClick={() => api?.scrollTo(index)}
              type="button"
            >
              <span
                className={cn(
                  "size-2 rounded-full bg-white/50 shadow-sm transition-all duration-300 group-hover:bg-white/80 motion-reduce:transition-none",
                  // La diapositive active s'allonge au lieu de seulement changer de teinte : une
                  // différence de forme se voit là où une différence de contraste seule se perd, et
                  // se transmet à qui ne distingue pas les nuances.
                  index === current && "w-5 bg-white",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}
    </Carousel>
  );
}

/** Six secondes : le temps de lire un titre et une ligne de contexte sans avoir à se dépêcher. */
const AUTOPLAY_DELAY = 6000;

/**
 * Une bande de commande sur le flanc de la bannière.
 *
 * `z-20` la place au-dessus du voile **et** du calque de contenu, faute de quoi le second — qui
 * couvre toute la boîte pour disposer texte et jaquette — intercepterait le clic sur toute la
 * hauteur.
 */
function HeroArrow({
  side,
  label,
  onClick,
  disabled,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;

  if (disabled) return null;

  return (
    <button
      aria-label={label}
      className={cn(
        "absolute top-0 bottom-0 z-20 hidden items-center justify-center bg-transparent text-white/70 transition-colors hover:bg-black/35 hover:text-white focus-visible:bg-black/35 focus-visible:text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:-outline-offset-2 md:flex",
        HERO_PEEK.band,
        side === "left" ? "left-0" : "right-0",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-7" />
    </button>
  );
}

/**
 * Ce que la diapositive a besoin de savoir du carrousel : **où l'on en est, et combien il y en a**.
 *
 * Elle ne peut pas le déduire seule — le rang lui est donné par l'appelant, mais « suis-je celle
 * qu'on regarde ? » demande l'état d'Embla, qui vit dans `HeroCarousel`. Le contexte est ce qui
 * porte la réponse sans faire passer un `current` par le serveur, qui ne l'a pas.
 *
 * Le repli à une seule diapositive n'est pas un cas d'école : il vaut pour le compte qui ne suit
 * qu'une œuvre, et il est ce qui rend la valeur par défaut honnête plutôt qu'arbitraire.
 */
const HeroSlideContext = createContext<{ current: number; count: number }>({
  current: 0,
  count: 1,
});

/**
 * Une diapositive : **80 % de la boîte, sauf quand elle est seule**.
 *
 * `HERO_HEIGHT` est sur l'élément d'Embla et `h-full` (via `HERO_SLIDE_BOX`) sur la boîte qu'il
 * contient : sans cette hauteur nommée ici, tout le contenu étant en position absolue, la
 * diapositive s'effondrerait à zéro pixel (le raisonnement complet est dans `hero-geometry.ts`).
 *
 * **Les voisines s'effacent et deviennent `inert`**, et la seconde moitié compte plus que la
 * première. Un dixième de diapositive suffit à laisser dépasser un bout de bouton « +1 » ou de lien
 * de genre : cliquables, ils agiraient sur une œuvre qu'on ne voit pas, et au clavier la tabulation
 * traverserait cinq fiches pour en atteindre une. `inert` retire d'un coup le pointeur, le focus et
 * l'arbre d'accessibilité — c'est le motif recommandé pour un carrousel, et il tombe juste ici
 * puisque Embla écoute le geste sur le viewport, au-dessus : le balayage part encore d'une bande
 * inerte.
 *
 * **Le débordement ne montre que l'illustration** : le calque de texte de la voisine s'efface, et
 * l'image restante s'estompe. Sans cela on voit dépasser un tiers de titre, une puce de genre coupée
 * en deux et le flanc d'une jaquette — trouvé à l'écran, et ça se lit comme un défaut d'affichage.
 * L'estompage tient au même motif : à pleine luminosité, deux bandes d'illustration de part et
 * d'autre entrent en concurrence avec le titre qu'elles encadrent.
 *
 * Le calque est désigné par `data-slot` parce qu'il vient du serveur en `children` — on ne peut pas
 * lui passer une classe, seulement l'atteindre depuis son parent (voir `HeroSlide`).
 */
export function HeroCarouselItem({
  index,
  children,
}: {
  /** Le rang de la diapositive, donné par l'appelant qui la rend — voir `HeroSlideContext`. */
  index: number;
  children: ReactNode;
}) {
  const { current, count } = useContext(HeroSlideContext);
  const active = count < 2 || index === current;

  return (
    <CarouselItem
      className={cn(
        "relative pl-0",
        HERO_HEIGHT,
        count > 1 ? HERO_PEEK.basis : "basis-full",
      )}
    >
      <div
        className={cn(
          HERO_SLIDE_BOX,
          "transition-opacity duration-500 motion-reduce:transition-none",
          !active && "opacity-45 **:data-[slot=hero-content]:opacity-0",
        )}
        inert={!active}
      >
        {children}
      </div>
    </CarouselItem>
  );
}

/**
 * Le squelette, dans le **même fichier** que ce qu'il remplace — même règle que `MediaCarousel` et
 * `MediaGrid` : c'est la seule façon de garantir qu'ils ne divergent pas. Il porte donc exactement la
 * boîte de `HERO_BOX`, faute de quoi l'accueil sauterait à la fin du chargement, c'est-à-dire ferait
 * ce qu'un squelette est là pour éviter.
 */
export function HeroCarouselSkeleton() {
  return (
    <div className={cn(HERO_BOX, "flex justify-center")}>
      {/*
        Le squelette **déborde comme le bandeau** : une boîte pleine largeur remplacée par une boîte
        à 80 % rétrécirait de 10 % de chaque côté à la fin du chargement. Il ne dessine pas les
        voisines pour autant — deux aplats gris supplémentaires ne diraient rien de plus qu'un seul,
        et le nombre de diapositives n'est pas connu à ce moment-là.
      */}
      <div className={cn(HERO_SLIDE_BOX, HERO_PEEK.basis, "shrink-0 bg-muted")}>
        <div className="flex h-full max-w-175 flex-col justify-center gap-4 px-4 sm:px-6 md:px-12">
          <Skeleton className="h-9 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-11 w-56" />
        </div>
      </div>
    </div>
  );
}
