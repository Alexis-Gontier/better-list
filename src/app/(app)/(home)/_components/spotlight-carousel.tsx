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
 * **La diapositive active reste dans la largeur du contenu ; ses voisines débordent** jusqu'aux
 * bords de la fenêtre.
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
        **La diapositive fait la largeur du contenu, le carrousel celle de la fenêtre.**

        Le carrousel sort du conteneur central (`w-screen`) pour que les voisines aillent jusqu'aux
        bords ; la diapositive, elle, reprend exactement la boîte de contenu du `main` de
        `(app)/layout.tsx` — `max-w-6xl` moins sa marge `px-6`, soit 69rem, ou la fenêtre moins
        cette marge en dessous. Si ce layout change de largeur, ces deux valeurs le suivent.

        L'écart est porté par un `px-2` **symétrique** plutôt que le `pl-4` par défaut : centrée, une
        diapositive à marge gauche seule serait décalée de huit pixels vers la droite du contenu.
        D'où le `+ 1rem` sur la base, et le `ml-0` qui annule le `-ml-4` du conteneur.
      */}
      <CarouselContent className="ml-0">
        {slides.map((slide, index) => (
          <CarouselItem
            aria-label={`${index + 1} sur ${slides.length}`}
            className={cn(
              "basis-[calc(100vw-1rem)] px-2 transition-opacity duration-700 ease-out sm:basis-[calc(min(100vw-3rem,69rem)+1rem)] motion-reduce:transition-none",
              index !== current && "opacity-40",
            )}
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
  );
}
