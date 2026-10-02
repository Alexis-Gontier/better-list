"use client";

import Autoplay from "embla-carousel-autoplay";
import { Children, useEffect, useRef, useState } from "react";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

/** Le temps passé sur une diapositive avant la suivante. */
const AUTOPLAY_DELAY_MS = 6000;

/**
 * La vitesse du glissement, dans l'unité d'Embla (25 par défaut, plus haut = plus lent).
 *
 * Relevée pour que le passage d'une diapositive à l'autre se lise comme un fondu en mouvement
 * plutôt qu'un saut — le carrousel défile seul, donc l'œil ne s'y attend pas.
 */
const SLIDE_DURATION = 45;

/**
 * Le carrousel de tête, **centré** : la diapositive active au milieu, ses voisines qui dépassent de
 * part et d'autre, atténuées.
 *
 * **La diapositive fait la largeur du contenu, le carrousel celle de la fenêtre** (décision
 * d'Alexis du 2 octobre 2026, qui revient sur les trois quarts du 28 septembre). Même débord que
 * `MediaBanner` (`left-1/2 w-screen -translate-x-1/2`) ; le `overflow-x-clip` du layout `(app)`
 * rattrape les pixels de la barre de défilement.
 *
 * Construit sur le motif de la doc shadcn — `setApi` pour suivre la diapositive courante, le
 * plugin `Autoplay` d'Embla pour le défilement. Il se met en pause au survol et ne défile pas du
 * tout quand le système demande de réduire les animations.
 */
export function SpotlightCarousel({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const autoplay = useRef(
    Autoplay({
      delay: AUTOPLAY_DELAY_MS,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const slides = Children.toArray(children);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (reducedMotion) autoplay.current.stop();
  }, [reducedMotion]);

  return (
    /*
      Le conteneur de requête reste dans le `main` : `100cqw` y vaut exactement la largeur du
      contenu, à tous les points de rupture. `100vw` compterait la barre de défilement, et la
      diapositive déborderait du contenu de quelques pixels de chaque côté.
    */
    <div className="@container">
      <Carousel
        aria-label="À la une"
        className="relative left-1/2 flex w-screen -translate-x-1/2 flex-col gap-4"
        opts={{
          align: "center",
          loop: slides.length > 2,
          duration: reducedMotion ? 0 : SLIDE_DURATION,
        }}
        plugins={[autoplay.current]}
        setApi={setApi}
      >
        {/*
        **La diapositive reprend exactement la boîte de contenu du `main`** (`100cqw`, mesurée sur
        le conteneur de requête ci-dessus) ; le carrousel, lui, sort jusqu'aux bords de la fenêtre,
        et les voisines dépassent jusque-là, atténuées.

        `data-current` et le groupe `spotlight` laissent la diapositive éteindre son texte quand elle
        n'est pas au centre : sans quoi un bout de titre dépasse dans la marge d'une voisine.

        L'écart est porté par un `px-2` **symétrique** plutôt que le `pl-4` par défaut : centrée, une
        diapositive à marge gauche seule serait décalée de huit pixels vers la droite du contenu.
        D'où le `+ 1rem` sur la base, et le `ml-0` qui annule le `-ml-4` du conteneur.
      */}
        <CarouselContent className="ml-0">
          {slides.map((slide, index) => (
            <CarouselItem
              aria-label={`${index + 1} sur ${slides.length}`}
              className={cn(
                "group/spotlight basis-[calc(100cqw+1rem)] px-2 transition-opacity duration-700 ease-out motion-reduce:transition-none",
                index !== current && "opacity-40",
              )}
              data-current={index === current}
              // biome-ignore lint/suspicious/noArrayIndexKey: l'ordre des diapositives est figé au rendu serveur.
              key={index}
            >
              {slide}
            </CarouselItem>
          ))}
        </CarouselContent>

        {count > 1 ? (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: count }, (_, index) => (
                <button
                  aria-current={index === current}
                  aria-label={`Aller à la diapositive ${index + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500 ease-out motion-reduce:transition-none",
                    index === current
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground",
                  )}
                  // biome-ignore lint/suspicious/noArrayIndexKey: un point par diapositive, dans le même ordre.
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  type="button"
                />
              ))}
            </div>
          </div>
        ) : null}
      </Carousel>
    </div>
  );
}
